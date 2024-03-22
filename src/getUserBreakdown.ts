import { getAddress, getContract } from 'viem';
import { ButtonToken } from './abis/ButtonToken.ts';
import { ERC20 } from './abis/ERC20.ts';
import { UnbuttonToken } from './abis/UnbuttonToken.ts';
import { ChainId, chainsConfig, getChainId } from './chains.ts';
import { getWrappedTokens, WrapperType } from './getWrappedTokens.ts';
import {
  getLiquidityPositionsMapForToken,
  LiquidityPosition,
} from './subgraphs/buttonswap.ts';
import { getVaultOwnerMap } from './subgraphs/points.ts';

const deadAddress = getAddress('0x0000000000000000000000000000000000000000');

export interface User {
  liquidityTokenBalance: bigint;
  computedTokenBalance: bigint;
  computedEquivalentInputTokenBalance?: bigint;
}

export interface PairUserBreakdown {
  liquidityTokenTotalSupply: bigint;
  tokenBalance: bigint;
  equivalentInputTokenBalance?: bigint;
  wrapper?: WrapperType;
  users: {
    [userAddress: string]: User;
  };
}

export interface TokenUserBreakdown {
  [pairAddress: string]: PairUserBreakdown;
}

export interface UserBreakdown {
  chainId: ChainId;
  inputTokenAddress: string;
  timestamp: number;
  breakdown: {
    [tokenAddress: string]: TokenUserBreakdown;
  };
}

async function getPairUserBreakdown({
  chainId,
  tokenAddress,
  pairAddress,
  vaultOwnerMap,
  liquidityPositions,
  wrapper,
}: {
  chainId: ChainId;
  tokenAddress: string;
  pairAddress: string;
  vaultOwnerMap: Map<string, string>;
  liquidityPositions: LiquidityPosition[];
  wrapper?: WrapperType;
}): Promise<PairUserBreakdown> {
  const client = chainsConfig.getClient({ chainId: getChainId(chainId) });

  const pairContract = getContract({
    address: getAddress(pairAddress),
    abi: ERC20,
    client,
  });
  const tokenContract = getContract({
    address: getAddress(tokenAddress),
    abi: ERC20,
    client,
  });

  console.log(`Querying ${pairAddress} supply and balance...`);
  const [liquidityTokenTotalSupply, deadLiquidityTokenBalance, tokenBalance] =
    await Promise.all([
      pairContract.read.totalSupply(),
      pairContract.read.balanceOf([deadAddress]),
      tokenContract.read.balanceOf([getAddress(pairAddress)]),
    ]);

  let equivalentInputTokenBalance: bigint | undefined = undefined;
  if (wrapper === 'button') {
    const buttonTokenContract = getContract({
      address: getAddress(tokenAddress),
      abi: ButtonToken,
      client,
    });
    equivalentInputTokenBalance =
      await buttonTokenContract.read.wrapperToUnderlying([tokenBalance]);
  } else if (wrapper === 'unbutton') {
    const buttonTokenContract = getContract({
      address: getAddress(tokenAddress),
      abi: UnbuttonToken,
      client,
    });
    equivalentInputTokenBalance =
      await buttonTokenContract.read.wrapperToUnderlying([tokenBalance]);
  }
  const users: PairUserBreakdown['users'] = {};
  liquidityPositions.forEach((liquidityPosition) => {
    const userAddress =
      vaultOwnerMap.get(liquidityPosition.userAddress) ||
      liquidityPosition.userAddress;
    const liquidityTokenBalance = liquidityPosition.liquidityTokenAmount;
    const computedTokenBalance =
      (tokenBalance * liquidityTokenBalance) /
      (liquidityTokenTotalSupply - deadLiquidityTokenBalance);
    let computedEquivalentInputTokenBalance: bigint | undefined = undefined;
    if (equivalentInputTokenBalance) {
      computedEquivalentInputTokenBalance =
        (equivalentInputTokenBalance * liquidityTokenBalance) /
        (liquidityTokenTotalSupply - deadLiquidityTokenBalance);
    }
    const existingEntry = users[userAddress] as User | undefined;
    if (existingEntry) {
      // If an entry already exists, then merge the new one into it
      // This means potentially multiple vaults and a user's own balance are collapsed into a single user entry
      existingEntry.liquidityTokenBalance += liquidityTokenBalance;
      existingEntry.computedTokenBalance += computedTokenBalance;
      if (
        typeof existingEntry.computedEquivalentInputTokenBalance === 'bigint' &&
        computedEquivalentInputTokenBalance
      ) {
        existingEntry.computedEquivalentInputTokenBalance +=
          computedEquivalentInputTokenBalance;
      }
    } else {
      users[userAddress] = {
        liquidityTokenBalance,
        computedTokenBalance,
        computedEquivalentInputTokenBalance,
      };
    }
  });

  return {
    liquidityTokenTotalSupply:
      liquidityTokenTotalSupply - deadLiquidityTokenBalance,
    tokenBalance,
    equivalentInputTokenBalance,
    wrapper,
    users,
  };
}

async function getTokenUserBreakdown({
  chainId,
  tokenAddress,
  vaultOwnerMap,
  wrapper,
}: {
  chainId: ChainId;
  tokenAddress: string;
  vaultOwnerMap: Map<string, string>;
  wrapper?: WrapperType;
}): Promise<TokenUserBreakdown> {
  const liquidityPositionsMap = await getLiquidityPositionsMapForToken(
    chainId,
    tokenAddress,
  );

  const tokenUserBreakdown: TokenUserBreakdown = {};
  const pairUserBreakdowns = await Promise.all(
    [...liquidityPositionsMap.entries()].map(
      async ([pairAddress, liquidityPositions]) => {
        const pairUserBreakdown = await getPairUserBreakdown({
          chainId,
          tokenAddress,
          pairAddress,
          vaultOwnerMap,
          liquidityPositions,
          wrapper,
        });
        return [pairAddress, pairUserBreakdown] as const;
      },
    ),
  );
  for (const [pairAddress, pairUserBreakdown] of pairUserBreakdowns) {
    tokenUserBreakdown[pairAddress] = pairUserBreakdown;
  }

  return tokenUserBreakdown;
}

export async function getUserBreakdown(
  chainId: ChainId,
  inputTokenAddress: string,
): Promise<UserBreakdown> {
  const wrappedTokens = await getWrappedTokens(chainId, inputTokenAddress);
  console.log(`Found ${wrappedTokens.length} wrapped tokens`);

  const vaultOwnerMap = await getVaultOwnerMap(chainId);
  console.log(`Found ${vaultOwnerMap.size} vaults`);

  const userBreakdown: UserBreakdown = {
    chainId,
    inputTokenAddress,
    timestamp: Date.now(),
    breakdown: {},
  };
  const tokenUserBreakdowns = [
    [
      inputTokenAddress,
      await getTokenUserBreakdown({
        chainId,
        tokenAddress: inputTokenAddress,
        vaultOwnerMap,
      }),
    ],
    ...(await Promise.all(
      wrappedTokens.map(async ({ wrapped, wrapper }) => {
        const tokenUserBreakdown = await getTokenUserBreakdown({
          chainId,
          tokenAddress: wrapped,
          vaultOwnerMap,
          wrapper,
        });
        return [wrapped, tokenUserBreakdown] as const;
      }),
    )),
  ] as const;

  for (const [tokenAddress, tokenUserBreakdown] of tokenUserBreakdowns) {
    userBreakdown.breakdown[tokenAddress] = tokenUserBreakdown;
  }

  return userBreakdown;
}
