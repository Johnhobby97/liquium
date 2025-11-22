/**
 * Chain configurations for Liquium
 */

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
}

export const CHAINS: Record<string, ChainConfig> = {
  flare: {
    id: 14,
    name: 'Flare Mainnet',
    rpcUrl: process.env.FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc',
    nativeCurrency: {
      name: 'Flare',
      symbol: 'FLR',
      decimals: 18,
    },
    blockExplorer: 'https://flare-explorer.flare.network',
  },
  base: {
    id: 8453,
    name: 'Base Mainnet',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://basescan.org',
  },
};

export const HUB_CHAIN = CHAINS.flare;
export const REMOTE_CHAINS = [CHAINS.base];

export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((chain) => chain.id === chainId);
}

export function isHubChain(chainId: number): boolean {
  return chainId === HUB_CHAIN.id;
}

export function isRemoteChain(chainId: number): boolean {
  return REMOTE_CHAINS.some((chain) => chain.id === chainId);
}
