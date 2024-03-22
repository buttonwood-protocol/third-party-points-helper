import { gql } from '@apollo/client/core/index.ts';
import { getAddress } from 'viem';
import { ChainId } from '../chains.ts';
import { getApolloClient } from './getApolloClient.ts';

const pageSize = 1000;

export interface LiquidityPosition {
  pairAddress: string;
  userAddress: string;
  liquidityTokenAmount: bigint;
}

interface LiquidityPositionGraphData {
  id: string;
  amount: string;
  user: {
    id: string;
  };
}

interface PairGraphData {
  id: string;
}

interface PairsQueryResponse {
  pairs: PairGraphData[];
}

interface LiquidityPositionsQueryResponse {
  pair: {
    liquidityPositions: LiquidityPositionGraphData[];
  };
}

const GET_PAIRS = gql`
  query getPairs($tokenId: ID!) {
    pairs(where: { or: [{ token0: $tokenId }, { token1: $tokenId }] }) {
      id
    }
  }
`;

const GET_LIQUIDITY_POSITIONS = gql`
  query getLiquidityPositions($pairId: ID!, $lastID: ID!) {
    pair(id: $pairId) {
      liquidityPositions(first: ${pageSize}, where: { id_gt: $lastID }) {
        id
        amount
        user {
          id
        }
      }
    }
  }
`;

export async function getLiquidityPositionsForPair(
  chainId: ChainId,
  pairAddress: string,
): Promise<LiquidityPosition[]> {
  let liquidityPositions: LiquidityPositionGraphData[] = [];
  let lastID = '';
  const client = getApolloClient('buttonswap', chainId);

  let i = 0;
  let shouldContinue = true;
  while (shouldContinue) {
    console.log(
      `Fetching ${pairAddress} liquidityPositions ${i * pageSize} to ${(i + 1) * pageSize}...`,
    );
    const res = await client.query<LiquidityPositionsQueryResponse>({
      query: GET_LIQUIDITY_POSITIONS,
      variables: {
        pairId: pairAddress.toLowerCase(),
        lastID,
      },
      fetchPolicy: 'no-cache',
    });

    if (res.error) {
      throw res.error;
    }

    liquidityPositions = liquidityPositions.concat(
      res.data.pair.liquidityPositions,
    );

    if (res.data.pair.liquidityPositions.length < pageSize) {
      shouldContinue = false;
    } else {
      lastID =
        res.data.pair.liquidityPositions[
          res.data.pair.liquidityPositions.length - 1
        ].id;
      i++;
    }
  }

  return liquidityPositions
    .map((liquidityPosition) => {
      return {
        pairAddress,
        userAddress: getAddress(liquidityPosition.user.id),
        liquidityTokenAmount: BigInt(liquidityPosition.amount),
      };
    })
    .filter(({ liquidityTokenAmount }) => liquidityTokenAmount > 0n);
}

export async function getLiquidityPositionsMapForToken(
  chainId: ChainId,
  tokenAddress: string,
): Promise<Map<string, LiquidityPosition[]>> {
  const client = getApolloClient('buttonswap', chainId);
  const res = await client.query<PairsQueryResponse>({
    query: GET_PAIRS,
    variables: {
      tokenId: tokenAddress.toLowerCase(),
    },
    fetchPolicy: 'no-cache',
  });

  if (res.error) {
    throw res.error;
  }

  return new Map<string, LiquidityPosition[]>(
    await Promise.all(
      res.data.pairs.map(async ({ id }) => {
        const pairAddress = getAddress(id);
        const liquidityPositions = await getLiquidityPositionsForPair(
          chainId,
          pairAddress,
        );
        return [pairAddress, liquidityPositions] as const;
      }),
    ),
  );
}
