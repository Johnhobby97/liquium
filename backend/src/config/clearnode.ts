/**
 * ClearNode Configuration
 * Configuration constants for ERC-7824 ClearNode integration
 */

// ClearNode WebSocket endpoint
export const CLEARNODE_CONFIG = {
  // Production ClearNode WebSocket URL
  wsUrl: process.env.CLEARNODE_WS_URL || 'wss://clearnet.yellow.com/ws',
  
  // Application domain for authentication
  application: process.env.CLEARNODE_APP_DOMAIN || 'liquium.app',
  
  // Authentication scope
  scope: 'console',
  
  // Session expiration (1 hour by default)
  sessionExpiration: 3600,
  
  // Reconnection settings
  maxReconnectAttempts: 5,
  reconnectInterval: 3000, // Initial delay in ms
  reconnectBackoffMultiplier: 2,
  
  // Request timeout
  requestTimeout: 30000, // 30 seconds
  
  // Connection timeout
  connectionTimeout: 10000, // 10 seconds
  
  // EIP-712 domain for authentication
  eip712Domain: {
    name: process.env.CLEARNODE_DOMAIN_NAME || 'Liquium',
    version: '1',
  },
} as const;

// Protocol constants
export const PROTOCOL_CONSTANTS = {
  protocol: 'nitroliterpc',
  defaultQuorum: 100,
  defaultChallenge: 0,
} as const;
