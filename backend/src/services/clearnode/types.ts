/**
 * ClearNode Types
 * TypeScript types for ERC-7824 Nitrolite protocol messages
 */
import { Address } from 'viem';

// RPC Method names
export enum RPCMethod {
  AuthRequest = 'auth_request',
  AuthChallenge = 'auth_challenge',
  AuthVerify = 'auth_verify',
  AuthSuccess = 'auth_success',
  AuthFailure = 'auth_failure',
  CreateAppSession = 'create_app_session',
  GetChannels = 'get_channels',
  GetLedgerBalances = 'get_ledger_balances',
  GetConfig = 'get_config',
  UpdateState = 'update_state',
  Error = 'error',
}

// Base RPC message structure
export interface RPCRequest {
  req: [number, string, any[], number]; // [requestId, method, params, timestamp]
  sig: [string]; // [signature]
}

export interface RPCResponse {
  res: [number, string, any[], number]; // [requestId, method, result, timestamp]
  sig: [string]; // [signature]
}

export interface RPCError {
  err: [number, string, string, number]; // [requestId, code, message, timestamp]
  sig?: [string];
}

// Authentication types
export interface AuthRequestParams {
  address: Address;
  session_key: Address;
  application: string;
  expires_at: string; // Unix timestamp as string
  scope: string;
  allowances: Allowance[];
}

export interface AuthChallengeParams {
  challengeMessage: string;
}

export interface AuthVerifyParams {
  signature: string;
  challengeMessage: string;
}

export interface AuthSuccessParams {
  success: boolean;
  jwtToken?: string;
  message?: string;
}

// Allowance for token permissions
export interface Allowance {
  asset: string;
  amount: string;
}

// EIP-712 Domain
export interface EIP712Domain {
  name: string;
  version?: string;
  chainId?: number;
  verifyingContract?: Address;
}

// EIP-712 Policy message for authentication
export interface EIP712PolicyMessage {
  challenge: string;
  scope: string;
  wallet: Address;
  session_key: Address;
  expires_at: number;
  allowances: Allowance[];
}

// Application session types
export interface AppDefinition {
  protocol: string;
  participants: Address[];
  weights: number[];
  quorum: number;
  challenge: number;
  nonce: number;
}

export interface AppAllocation {
  participant: Address;
  asset: string;
  amount: string;
}

export interface CreateAppSessionParams {
  definition: AppDefinition;
  allocations: AppAllocation[];
}

export interface AppSessionResponse {
  app_session_id: string;
  status: 'open' | 'closed' | 'settling';
}

// Channel types
export interface ChannelInfo {
  channel_id: string;
  participant: Address;
  status: string;
  token: Address;
  amount: string;
  chain_id: number;
  adjudicator: Address;
  challenge: number;
  nonce: number;
  version: number;
  created_at: string;
  updated_at: string;
}

// Ledger balance types
export interface LedgerBalance {
  participant: Address;
  asset: string;
  balance: string;
}

// Message signer function type
export type MessageSigner = (payload: RequestData | ResponsePayload) => Promise<string>;

// Request/Response payload types for signing
export interface RequestData {
  req: [number, string, any[], number];
}

export interface ResponsePayload {
  res: [number, string, any[], number];
}

// Connection status
export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Authenticating = 'authenticating',
  Authenticated = 'authenticated',
  Error = 'error',
}

// Event types
export interface ClearNodeEvents {
  connected: () => void;
  disconnected: (event: { code: number; reason: string }) => void;
  authenticated: (token?: string) => void;
  message: (message: RPCResponse | RPCError) => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
}
