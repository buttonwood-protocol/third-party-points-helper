import { createConfig } from '@wagmi/core';
import { http } from 'viem';
import { arbitrum, avalanche, base, mainnet, optimism } from 'viem/chains';
import { config } from './config.ts';

export enum ChainId {
  EthereumMainnet = 1,
  // Goerli = 5,
  OPMainnet = 10,
  BaseMainnet = 8453,
  ArbitrumOne = 42161,
  // AvalancheFujiTestnet = 43113,
  AvalancheCChain = 43114,
  // Blast = 81457,
  // BaseGoerli = 84531,
  // ArbitrumGoerli = 421613,
  // Sepolia = 11155111,
  // BlastSepolia = 168587773,
}

export const chains = {
  [ChainId.EthereumMainnet]: mainnet,
  // [ChainId.Goerli]: goerli,
  [ChainId.OPMainnet]: optimism,
  [ChainId.BaseMainnet]: base,
  [ChainId.ArbitrumOne]: arbitrum,
  // [ChainId.AvalancheFujiTestnet]: avalancheFuji,
  [ChainId.AvalancheCChain]: avalanche,
  // [ChainId.Blast]: blast,
  // [ChainId.BaseGoerli]: baseGoerli,
  // [ChainId.ArbitrumGoerli]: arbitrumGoerli,
  // [ChainId.Sepolia]: sepolia,
  // [ChainId.BlastSepolia]: blastSepolia,
};

const rpcUrlPrivate = {
  [ChainId.EthereumMainnet]: `https://mainnet.infura.io/v3/${config.infuraProjectId}`,
  // [ChainId.Goerli]: `https://goerli.infura.io/v3/${config.infuraProjectId}`,
  [ChainId.AvalancheCChain]: `https://avalanche-mainnet.infura.io/v3/${config.infuraProjectId}`,
  // [ChainId.Sepolia]: `https://sepolia.infura.io/v3/${config.infuraProjectId}`,
};

export const chainsConfig = createConfig({
  chains: [
    arbitrum,
    // arbitrumGoerli,
    avalanche,
    // avalancheFuji,
    base,
    // baseGoerli,
    // blast,
    // blastSepolia,
    // goerli,
    mainnet,
    optimism,
    // sepolia,
  ],
  transports: {
    [ChainId.EthereumMainnet]: http(rpcUrlPrivate[ChainId.EthereumMainnet]),
    // [ChainId.Goerli]: http(rpcUrlPrivate[ChainId.Goerli]),
    [ChainId.OPMainnet]: http(),
    [ChainId.BaseMainnet]: http(),
    [ChainId.ArbitrumOne]: http(),
    // [ChainId.AvalancheFujiTestnet]: http(),
    [ChainId.AvalancheCChain]: http(rpcUrlPrivate[ChainId.AvalancheCChain]),
    // [ChainId.Blast]: http(),
    // [ChainId.BaseGoerli]: http(),
    // [ChainId.ArbitrumGoerli]: http(),
    // [ChainId.Sepolia]: http(rpcUrlPrivate[ChainId.Sepolia]),
    // [ChainId.BlastSepolia]: http(),
  },
});

/**
 * Coerces a chainId from number type to ChainId type
 * This is required for looking up values from typed key maps
 */
export function getChainId(chainId: number): ChainId {
  switch (chainId) {
    case ChainId.EthereumMainnet:
      return ChainId.EthereumMainnet;
    // case ChainId.Goerli:
    //   return ChainId.Goerli;
    case ChainId.OPMainnet:
      return ChainId.OPMainnet;
    case ChainId.BaseMainnet:
      return ChainId.BaseMainnet;
    case ChainId.ArbitrumOne:
      return ChainId.ArbitrumOne;
    // case ChainId.AvalancheFujiTestnet:
    //   return ChainId.AvalancheFujiTestnet;
    case ChainId.AvalancheCChain:
      return ChainId.AvalancheCChain;
    // case ChainId.Blast:
    //   return ChainId.Blast;
    // case ChainId.BaseGoerli:
    //   return ChainId.BaseGoerli;
    // case ChainId.ArbitrumGoerli:
    //   return ChainId.ArbitrumGoerli;
    // case ChainId.Sepolia:
    //   return ChainId.Sepolia;
    // case ChainId.BlastSepolia:
    //   return ChainId.BlastSepolia;
    default:
      throw new Error(`Invalid chainId: ${chainId}`);
  }
}
