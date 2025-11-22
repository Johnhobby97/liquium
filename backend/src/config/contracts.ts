/**
 * Contract addresses and configurations
 */

export interface ContractAddresses {
  // Core contracts
  dealVault: string;
  dealPosition: string;
  channelRegistry: string;
  
  // Integrations
  yellowChannel: string;
  nitroliteAdapter: string;
  flarePriceReader: string;
  
  // Remote vaults
  remoteVault?: string;
  remotePosition?: string;
  
  // Nitrolite
  custodyContract?: string;
}

// Flare Coston2 contracts (Hub)
export const FLARE_CONTRACTS: ContractAddresses = {
  dealVault: process.env.DEAL_VAULT_ADDRESS || '',
  dealPosition: process.env.DEAL_POSITION_ADDRESS || '',
  channelRegistry: process.env.CHANNEL_REGISTRY_ADDRESS || '',
  yellowChannel: process.env.YELLOW_CHANNEL_ADDRESS || '',
  nitroliteAdapter: process.env.NITROLITE_ADAPTER_ADDRESS || '',
  flarePriceReader: process.env.FLARE_PRICE_READER_ADDRESS || '',
  custodyContract: process.env.CUSTODY_CONTRACT_ADDRESS,
};

// Base Sepolia contracts (Remote)
export const BASE_CONTRACTS: ContractAddresses = {
  dealVault: '', // Not used on remote chain
  dealPosition: process.env.BASE_POSITION_ADDRESS || '',
  channelRegistry: '', // Not used
  yellowChannel: '', // Not used
  nitroliteAdapter: '', // Not used
  flarePriceReader: '', // Not used
  remoteVault: process.env.REMOTE_VAULT_ADDRESS || '',
  remotePosition: process.env.BASE_POSITION_ADDRESS || '',
};

// FTSO Configuration
export const FTSO_CONFIG = {
  registryAddress: process.env.FTSO_REGISTRY_ADDRESS || '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019',
  updateInterval: 90_000, // 90 seconds
};

// Yellow Network Configuration
export const YELLOW_CONFIG = {
  wsUrl: process.env.YELLOW_NODE_WS_URL || 'wss://testnet.yellow.org',
  appId: process.env.YELLOW_APP_ID || '',
  appSecret: process.env.YELLOW_APP_SECRET || '',
  challengePeriod: 86400, // 1 day in seconds
};

export function getContractsByChain(chainId: number): ContractAddresses {
  switch (chainId) {
    case 114: // Flare Coston2
      return FLARE_CONTRACTS;
    case 84532: // Base Sepolia
      return BASE_CONTRACTS;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// Validate required contracts are configured
export function validateContracts(): void {
  const required = [
    'DEAL_VAULT_ADDRESS',
    'DEAL_POSITION_ADDRESS',
    'YELLOW_CHANNEL_ADDRESS',
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required contract addresses: ${missing.join(', ')}\n` +
      'Please check your .env file'
    );
  }
}
