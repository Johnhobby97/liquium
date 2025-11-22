/**
 * ClearNode Service
 * Manages WebSocket connection and communication with ClearNode
 */
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { type Address } from 'viem';
import { createModuleLogger } from '../../utils/logger';
import { CLEARNODE_CONFIG } from '../../config/clearnode';
import {
  createMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createSignedRequest,
} from './MessageSigner';
import {
  type MessageSigner,
  type RPCResponse,
  type RPCError,
  type ClearNodeEvents,
  ConnectionStatus,
  RPCMethod,
  type AppDefinition,
  type AppAllocation,
  type ChannelInfo,
} from './types';

const logger = createModuleLogger('clearnode');

/**
 * ClearNode Service
 * Handles all communication with ClearNode via WebSocket
 */
export class ClearNodeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private wallet: ethers.Wallet | null = null;
  private messageSigner: MessageSigner | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;
  private isAuthenticated: boolean = false;
  private jwtToken: string | null = null;
  private reconnectAttempts: number = 0;
  private requestMap: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  // Authentication params
  private authParams: {
    address: Address;
    sessionKey: Address;
    expiresAt: number;
  } | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize the service with a wallet
   */
  async initialize(privateKey: string) {
    try {
      this.wallet = new ethers.Wallet(privateKey);
      this.messageSigner = createMessageSigner(this.wallet);
      
      // Set auth params
      this.authParams = {
        address: this.wallet.address as Address,
        sessionKey: this.wallet.address as Address, // Using same for simplicity
        expiresAt: Math.floor(Date.now() / 1000) + CLEARNODE_CONFIG.sessionExpiration,
      };

      logger.info('ClearNode service initialized', {
        address: this.wallet.address,
      });
    } catch (error) {
      logger.error('Failed to initialize ClearNode service', error);
      throw error;
    }
  }

  /**
   * Connect to ClearNode
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wallet || !this.messageSigner || !this.authParams) {
        reject(new Error('Service not initialized'));
        return;
      }

      if (this.ws) {
        this.ws.close();
      }

      this.connectionStatus = ConnectionStatus.Connecting;
      this.emit('connecting');

      logger.info('Connecting to ClearNode', { url: CLEARNODE_CONFIG.wsUrl });

      this.ws = new WebSocket(CLEARNODE_CONFIG.wsUrl);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionStatus === ConnectionStatus.Connecting) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, CLEARNODE_CONFIG.connectionTimeout);

      // WebSocket event handlers
      this.ws.on('open', async () => {
        clearTimeout(connectionTimeout);
        this.connectionStatus = ConnectionStatus.Connected;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        logger.info('WebSocket connected to ClearNode');

        // Start authentication
        try {
          await this.startAuthentication();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        logger.error('WebSocket error', error);
        this.emit('error', error);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        this.connectionStatus = ConnectionStatus.Disconnected;
        this.isAuthenticated = false;
        
        logger.info('WebSocket closed', {
          code,
          reason: reason.toString(),
        });

        this.emit('disconnected', {
          code,
          reason: reason.toString(),
        });

        // Attempt reconnection
        this.attemptReconnect();
      });
    });
  }

  /**
   * Start authentication flow
   */
  private async startAuthentication() {
    if (!this.wallet || !this.messageSigner || !this.authParams) {
      throw new Error('Service not initialized');
    }

    this.connectionStatus = ConnectionStatus.Authenticating;

    try {
      // Create and send auth_request
      const authRequest = await createAuthRequestMessage(
        this.messageSigner,
        this.authParams.address,
        this.authParams.sessionKey,
        CLEARNODE_CONFIG.application,
        this.authParams.expiresAt,
        CLEARNODE_CONFIG.scope,
        []
      );

      logger.info('Sending auth_request');
      this.ws?.send(authRequest);

      // Authentication will complete when we receive auth_success
    } catch (error) {
      logger.error('Authentication failed', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(data: WebSocket.Data) {
    try {
      const rawData = typeof data === 'string' ? data : data.toString();
      const message: RPCResponse | RPCError = JSON.parse(rawData);

      // Handle responses
      if ('res' in message) {
        const [requestId, method, result] = message.res;

        logger.debug('Received response', { method, requestId });

        // Handle authentication messages
        if (method === RPCMethod.AuthChallenge) {
          await this.handleAuthChallenge(message as RPCResponse);
          return;
        }

        if (method === RPCMethod.AuthVerify) {
          await this.handleAuthSuccess(message as RPCResponse);
          return;
        }

        // Handle other responses
        const handler = this.requestMap.get(requestId);
        if (handler) {
          clearTimeout(handler.timeout);
          handler.resolve(result);
          this.requestMap.delete(requestId);
        }

        this.emit('message', message);
      }

      // Handle errors
      if ('err' in message) {
        const [requestId, code, errorMessage] = message.err;
        
        logger.error('Received error', { code, errorMessage, requestId });

        const handler = this.requestMap.get(requestId);
        if (handler) {
          clearTimeout(handler.timeout);
          handler.reject(new Error(`${code}: ${errorMessage}`));
          this.requestMap.delete(requestId);
        }

        this.emit('error', new Error(errorMessage));
      }
    } catch (error) {
      logger.error('Error handling message', error);
    }
  }

  /**
   * Handle auth challenge response
   */
  private async handleAuthChallenge(message: RPCResponse) {
    if (!this.wallet || !this.authParams) {
      throw new Error('Service not initialized');
    }

    try {
      const challengeData = message.res[2];
      const challenge = challengeData[0]?.challengeMessage || challengeData.challengeMessage;

      if (!challenge) {
        throw new Error('No challenge in response');
      }

      logger.info('Received auth_challenge', { challenge: challenge.substring(0, 20) + '...' });

      // Create and send auth_verify with EIP-712 signature
      const authVerify = await createAuthVerifyMessage(
        this.wallet,
        CLEARNODE_CONFIG.eip712Domain,
        challenge,
        CLEARNODE_CONFIG.scope,
        this.authParams.address,
        this.authParams.sessionKey,
        this.authParams.expiresAt,
        []
      );

      logger.info('Sending auth_verify');
      this.ws?.send(authVerify);
    } catch (error) {
      logger.error('Failed to handle auth challenge', error);
      throw error;
    }
  }

  /**
   * Handle auth success response
   */
  private async handleAuthSuccess(message: RPCResponse) {
    try {
      const result = message.res[2];
      const success = result[0]?.success ?? result.success;
      const jwtToken = result[0]?.jwtToken ?? result.jwtToken;

      if (success) {
        this.isAuthenticated = true;
        this.connectionStatus = ConnectionStatus.Authenticated;
        
        if (jwtToken) {
          this.jwtToken = jwtToken;
          logger.info('JWT token received');
        }

        logger.info('Authentication successful');
        this.emit('authenticated', jwtToken);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      logger.error('Failed to handle auth success', error);
      throw error;
    }
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest(method: string, params: any[] = []): Promise<any> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    if (!this.messageSigner) {
      throw new Error('Message signer not initialized');
    }

    const requestId = Date.now();

    return new Promise(async (resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.requestMap.delete(requestId);
        reject(new Error(`Request timeout for ${method}`));
      }, CLEARNODE_CONFIG.requestTimeout);

      // Store handler
      this.requestMap.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      try {
        // Create and send request
        const request = await createSignedRequest(this.messageSigner!, method, params);
        this.ws?.send(request);
        
        logger.debug('Request sent', { method, requestId });
      } catch (error) {
        clearTimeout(timeout);
        this.requestMap.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Create application session
   */
  async createAppSession(
    definition: AppDefinition,
    allocations: AppAllocation[]
  ): Promise<{ app_session_id: string; status: string }> {
    try {
      logger.info('Creating application session', {
        participants: definition.participants,
      });

      const result = await this.sendRequest(RPCMethod.CreateAppSession, [
        { definition, allocations },
      ]);

      const appSessionData = result[0] || result;
      
      logger.info('Application session created', {
        app_session_id: appSessionData.app_session_id,
      });

      return appSessionData;
    } catch (error) {
      logger.error('Failed to create application session', error);
      throw error;
    }
  }

  /**
   * Get channels
   */
  async getChannels(): Promise<ChannelInfo[]> {
    try {
      const result = await this.sendRequest(RPCMethod.GetChannels, [
        { participant: this.authParams?.address },
      ]);

      return result[0] || result || [];
    } catch (error) {
      logger.error('Failed to get channels', error);
      throw error;
    }
  }

  /**
   * Get ledger balances
   */
  async getLedgerBalances(channelId: string): Promise<any> {
    try {
      const result = await this.sendRequest(RPCMethod.GetLedgerBalances, [
        { channel_id: channelId },
      ]);

      return result;
    } catch (error) {
      logger.error('Failed to get ledger balances', error);
      throw error;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= CLEARNODE_CONFIG.maxReconnectAttempts) {
      logger.error('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = CLEARNODE_CONFIG.reconnectInterval * 
      Math.pow(CLEARNODE_CONFIG.reconnectBackoffMultiplier, this.reconnectAttempts - 1);

    logger.info('Attempting to reconnect', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.emit('reconnecting', this.reconnectAttempts);

    setTimeout(() => {
      this.connect().catch(error => {
        logger.error(`Reconnection attempt ${this.reconnectAttempts} failed`, error);
      });
    }, delay);
  }

  /**
   * Disconnect from ClearNode
   */
  disconnect() {
    if (this.ws) {
      // Clear all pending requests
      for (const [requestId, handler] of this.requestMap.entries()) {
        clearTimeout(handler.timeout);
        handler.reject(new Error('Connection closed'));
        this.requestMap.delete(requestId);
      }

      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }

    this.isAuthenticated = false;
    this.connectionStatus = ConnectionStatus.Disconnected;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    status: ConnectionStatus;
    authenticated: boolean;
    address: Address | null;
  } {
    return {
      status: this.connectionStatus,
      authenticated: this.isAuthenticated,
      address: this.authParams?.address || null,
    };
  }
}

// Export singleton instance
export const clearNodeService = new ClearNodeService();
