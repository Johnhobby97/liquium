/**
 * Message Signer for ClearNode
 * Handles ECDSA and EIP-712 message signing for Nitrolite protocol
 */
import { ethers } from 'ethers';
import { type Address } from 'viem';
import {
  type MessageSigner,
  type RequestData,
  type ResponsePayload,
  type EIP712Domain,
  type EIP712PolicyMessage,
  type Allowance,
} from './types';

/**
 * Create a message signer function using a wallet
 * Signs plain JSON payloads without EIP-191 prefix
 */
export function createMessageSigner(wallet: ethers.Wallet): MessageSigner {
  return async (payload: RequestData | ResponsePayload): Promise<string> => {
    try {
      const message = JSON.stringify(payload);
      const digestHex = ethers.id(message);
      const messageBytes = ethers.getBytes(digestHex);
      
      // Sign digest directly without EIP-191 prefix
      const { serialized: signature } = wallet.signingKey.sign(messageBytes);
      
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };
}

/**
 * Create EIP-712 signer for authentication flow
 */
export async function signEIP712AuthMessage(
  wallet: ethers.Wallet,
  domain: EIP712Domain,
  policyMessage: EIP712PolicyMessage
): Promise<string> {
  try {
    // EIP-712 domain
    const domainData = {
      name: domain.name,
      ...(domain.version && { version: domain.version }),
      ...(domain.chainId && { chainId: domain.chainId }),
      ...(domain.verifyingContract && { verifyingContract: domain.verifyingContract }),
    };

    // EIP-712 types
    const types = {
      Policy: [
        { name: 'challenge', type: 'string' },
        { name: 'scope', type: 'string' },
        { name: 'wallet', type: 'address' },
        { name: 'session_key', type: 'address' },
        { name: 'expires_at', type: 'uint64' },
        { name: 'allowances', type: 'Allowance[]' },
      ],
      Allowance: [
        { name: 'asset', type: 'string' },
        { name: 'amount', type: 'string' },
      ],
    };

    // Sign using EIP-712
    const signature = await wallet.signTypedData(domainData, types, policyMessage);
    
    return signature;
  } catch (error) {
    console.error('Error signing EIP-712 message:', error);
    throw error;
  }
}

/**
 * Helper to create auth request message
 */
export async function createAuthRequestMessage(
  signer: MessageSigner,
  address: Address,
  sessionKey: Address,
  application: string,
  expiresAt: number,
  scope: string = 'console',
  allowances: Allowance[] = []
): Promise<string> {
  const requestId = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);
  
  const params = {
    address,
    session_key: sessionKey,
    application,
    expires_at: expiresAt.toString(),
    scope,
    allowances,
  };

  const request: RequestData = {
    req: [requestId, 'auth_request', [params], timestamp],
  };

  const signature = await signer(request);
  
  return JSON.stringify({
    req: request.req,
    sig: [signature],
  });
}

/**
 * Helper to create auth verify message
 */
export async function createAuthVerifyMessage(
  wallet: ethers.Wallet,
  domain: EIP712Domain,
  challenge: string,
  scope: string,
  walletAddress: Address,
  sessionKey: Address,
  expiresAt: number,
  allowances: Allowance[] = []
): Promise<string> {
  const requestId = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);

  // Create EIP-712 policy message
  const policyMessage: EIP712PolicyMessage = {
    challenge,
    scope,
    wallet: walletAddress,
    session_key: sessionKey,
    expires_at: expiresAt,
    allowances,
  };

  // Sign with EIP-712
  const eip712Signature = await signEIP712AuthMessage(wallet, domain, policyMessage);

  // Create message signer for the request
  const messageSigner = createMessageSigner(wallet);

  const params = {
    signature: eip712Signature,
    challengeMessage: challenge,
  };

  const request: RequestData = {
    req: [requestId, 'auth_verify', [params], timestamp],
  };

  const signature = await messageSigner(request);

  return JSON.stringify({
    req: request.req,
    sig: [signature],
  });
}

/**
 * Helper to create signed request
 */
export async function createSignedRequest(
  signer: MessageSigner,
  method: string,
  params: any[] = []
): Promise<string> {
  const requestId = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);

  const request: RequestData = {
    req: [requestId, method, params, timestamp],
  };

  const signature = await signer(request);

  return JSON.stringify({
    req: request.req,
    sig: [signature],
  });
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): number {
  return Date.now();
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
