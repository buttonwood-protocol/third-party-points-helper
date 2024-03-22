import { gql } from '@apollo/client/core/index.ts';
import { getAddress } from 'viem';
import { ChainId } from '../chains.ts';
import { getApolloClient } from './getApolloClient.ts';

const pageSize = 1000;

interface VaultGraphData {
  id: string;
  owner: {
    id: string;
  };
}

interface VaultsQueryResponse {
  vaults: VaultGraphData[];
}

const GET_VAULTS = gql`
  query getVaults($lastID: ID!) {
    vaults(first: ${pageSize}, where: { id_gt: $lastID }) {
      id
      owner {
        id
      }
    }
  }
`;

export async function getVaultOwnerMap(
  chainId: ChainId,
): Promise<Map<string, string>> {
  const vaultOwnerMap: Map<string, string> = new Map();
  let lastID = '';
  const client = getApolloClient('points', chainId);

  let i = 0;
  let shouldContinue = true;
  while (shouldContinue) {
    console.log(`Fetching vaults ${i * pageSize} to ${(i + 1) * pageSize}...`);
    const res = await client.query<VaultsQueryResponse>({
      query: GET_VAULTS,
      variables: {
        lastID,
      },
      fetchPolicy: 'no-cache',
    });

    if (res.error) {
      throw res.error;
    }

    for (const vault of res.data.vaults) {
      vaultOwnerMap.set(getAddress(vault.id), getAddress(vault.owner.id));
    }

    if (res.data.vaults.length < pageSize) {
      shouldContinue = false;
    } else {
      lastID = res.data.vaults[res.data.vaults.length - 1].id;
      i++;
    }
  }

  return vaultOwnerMap;
}
