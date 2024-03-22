import { NormalizedCacheObject } from '@apollo/client';
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core/index.ts';
import fetch from 'cross-fetch';
import { ChainId } from '../chains.ts';

export type SubgraphType = 'buttonswap' | 'points';

const SUBGRAPH_BASE_URI = 'https://api.thegraph.com/subgraphs/name';
const endpoints: Record<SubgraphType, Record<ChainId, string>> = {
  buttonswap: {
    [ChainId.EthereumMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/buttonswap`,
    [ChainId.AvalancheCChain]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/buttonswap-avalanche`,
    [ChainId.BaseMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/buttonswap-base-mainnet`,
    [ChainId.ArbitrumOne]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/buttonswap-arbitrum-one`,
    [ChainId.OPMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/buttonswap-optimism`,
  },
  points: {
    [ChainId.EthereumMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/points`,
    [ChainId.AvalancheCChain]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/points-avalanche`,
    [ChainId.BaseMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/points-base-mainnet`,
    [ChainId.ArbitrumOne]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/points-arbitrum-one`,
    [ChainId.OPMainnet]: `${SUBGRAPH_BASE_URI}/buttonwood-protocol/points-optimism`,
  },
};

const cache = new InMemoryCache();
const clients: Record<
  SubgraphType,
  Map<ChainId, ApolloClient<NormalizedCacheObject>>
> = {
  buttonswap: new Map(),
  points: new Map(),
};

export function getApolloClient(subgraphType: SubgraphType, chainId: ChainId) {
  let client = clients[subgraphType].get(chainId);
  if (!client) {
    client = new ApolloClient({
      cache: cache,
      link: new HttpLink({ uri: endpoints[subgraphType][chainId], fetch }),
    });
    clients[subgraphType].set(chainId, client);
  }
  return client;
}
