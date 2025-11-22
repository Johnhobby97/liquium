/**
 * Nitrolite Service
 * Manages state channels for deals using ERC-7824 ClearNode protocol
 */
import { type Address } from 'viem';
import { createModuleLogger } from '../../utils/logger';
import { getPrismaClient } from '../database/prisma';
import { clearNodeService } from '../clearnode/ClearNodeService';
import { PROTOCOL_CONSTANTS } from '../../config/clearnode';
import type { AppDefinition, AppAllocation } from '../clearnode/types';

const logger = createModuleLogger('nitrolite');
const prisma = getPrismaClient();

/**
 * Nitrolite Service for managing state channels via ClearNode
 */
export class NitroliteService {
  /**
   * Initialize Nitrolite service
   * Now wraps ClearNodeService
   */
  async initialize() {
    try {
      // Initialize ClearNode service
      if (!process.env.PRIVATE_KEY_BACKEND) {
        throw new Error('PRIVATE_KEY_BACKEND not configured');
      }

      await clearNodeService.initialize(process.env.PRIVATE_KEY_BACKEND);
      await clearNodeService.connect();

      logger.info('Nitrolite service initialized with ClearNode');
    } catch (error) {
      logger.error('Failed to initialize Nitrolite service', error);
      throw error;
    }
  }

  /**
   * Create a state channel for a deal
   * Uses ClearNode to create application session
   */
  async createChannelForDeal(
    dealId: bigint,
    dealer: Address,
    lp: Address,
    lpAmount: bigint
  ) {
    try {
      logger.info('Creating state channel for deal', {
        dealId: dealId.toString(),
        participants: [dealer, lp],
        lpAmount: lpAmount.toString(),
      });

      // Define application session
      const appDefinition: AppDefinition = {
        protocol: PROTOCOL_CONSTANTS.protocol,
        participants: [dealer, lp],
        weights: [50, 50], // Equal weight for both participants
        quorum: PROTOCOL_CONSTANTS.defaultQuorum,
        challenge: PROTOCOL_CONSTANTS.defaultChallenge,
        nonce: Date.now(),
      };

      // Define initial allocations
      // LP deposits funds, dealer starts with 0
      const allocations: AppAllocation[] = [
        {
          participant: dealer,
          asset: 'usdc', // Asset identifier
          amount: '0',
        },
        {
          participant: lp,
          asset: 'usdc',
          amount: lpAmount.toString(),
        },
      ];

      // Create application session via ClearNode
      const session = await clearNodeService.createAppSession(
        appDefinition,
        allocations
      );

      // Save channel state to database
      await prisma.channelState.create({
        data: {
          channelId: session.app_session_id,
          dealId,
          stateHash: session.app_session_id, // Use session ID as initial hash
          version: 1n,
          intent: 'INITIALIZE',
          allocation0: {
            destination: dealer,
            amount: '0',
          },
          allocation1: {
            destination: lp,
            amount: lpAmount.toString(),
          },
          participants: [dealer, lp],
          stateData: this.encodeDealId(dealId),
        },
      });

      // Save to history
      await prisma.stateHistory.create({
        data: {
          channelId: session.app_session_id,
          version: 1n,
          stateHash: session.app_session_id,
          intent: 'INITIALIZE',
          allocation0: {
            destination: dealer,
            amount: '0',
          },
          allocation1: {
            destination: lp,
            amount: lpAmount.toString(),
          },
          stateData: this.encodeDealId(dealId),
        },
      });

      logger.info('State channel created', {
        channelId: session.app_session_id,
        status: session.status,
      });

      return {
        channelId: session.app_session_id,
        status: session.status,
        initialState: {
          version: 1n,
          allocations: [
            { destination: dealer, amount: 0n },
            { destination: lp, amount: lpAmount },
          ],
        },
      };
    } catch (error) {
      logger.error('Failed to create channel for deal', error);
      throw error;
    }
  }

  /**
   * Update channel state (off-chain)
   * Updates allocations based on trading activity
   */
  async updateChannelState(
    channelId: string,
    newAmount0: bigint,
    newAmount1: bigint,
    stateData?: string
  ) {
    try {
      const currentState = await prisma.channelState.findUnique({
        where: { channelId },
      });

      if (!currentState) {
        throw new Error('Channel state not found');
      }

      const participants = currentState.participants as string[];
      const newVersion = currentState.version + 1n;

      // Update state in database
      await prisma.channelState.update({
        where: { channelId },
        data: {
          version: newVersion,
          intent: 'OPERATE',
          allocation0: {
            destination: participants[0],
            amount: newAmount0.toString(),
          },
          allocation1: {
            destination: participants[1],
            amount: newAmount1.toString(),
          },
          stateData: stateData || currentState.stateData,
        },
      });

      // Save to history
      await prisma.stateHistory.create({
        data: {
          channelId,
          version: newVersion,
          stateHash: newVersion.toString(),
          intent: 'OPERATE',
          allocation0: {
            destination: participants[0],
            amount: newAmount0.toString(),
          },
          allocation1: {
            destination: participants[1],
            amount: newAmount1.toString(),
          },
          stateData: stateData || currentState.stateData,
        },
      });

      logger.info('Channel state updated off-chain', {
        channelId,
        version: newVersion.toString(),
        allocations: [newAmount0.toString(), newAmount1.toString()],
      });

      return { channelId, version: newVersion };
    } catch (error) {
      logger.error('Failed to update channel state', error);
      throw error;
    }
  }

  /**
   * Finalize channel and prepare for settlement
   */
  async finalizeChannel(
    channelId: string,
    finalAmount0: bigint,
    finalAmount1: bigint
  ) {
    try {
      const currentState = await prisma.channelState.findUnique({
        where: { channelId },
      });

      if (!currentState) {
        throw new Error('Channel state not found');
      }

      const participants = currentState.participants as string[];

      // Update to FINALIZE state
      await prisma.channelState.update({
        where: { channelId },
        data: {
          version: { increment: 1 },
          intent: 'FINALIZE',
          allocation0: {
            destination: participants[0],
            amount: finalAmount0.toString(),
          },
          allocation1: {
            destination: participants[1],
            amount: finalAmount1.toString(),
          },
        },
      });

      logger.info('Channel finalized', {
        channelId,
        finalAllocations: [finalAmount0.toString(), finalAmount1.toString()],
      });

      // TODO: Submit final state to YellowChannel contract for on-chain settlement
      // This would involve:
      // 1. Getting final state signatures from both participants
      // 2. Calling conclude() on YellowChannel contract
      // 3. Participants can then withdraw from custody contract

      return { channelId, finalized: true };
    } catch (error) {
      logger.error('Failed to finalize channel', error);
      throw error;
    }
  }

  /**
   * Get channel state from database
   */
  async getChannelState(channelId: string) {
    return await prisma.channelState.findUnique({
      where: { channelId },
      include: {
        deal: true,
        stateHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all channels for a deal
   */
  async getChannelsForDeal(dealId: bigint) {
    return await prisma.channelState.findMany({
      where: { dealId },
      include: {
        stateHistory: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get channel status from ClearNode
   */
  async getChannelInfo(channelId: string) {
    try {
      const channels = await clearNodeService.getChannels();
      return channels.find(ch => ch.channel_id === channelId);
    } catch (error) {
      logger.error('Failed to get channel info from ClearNode', error);
      throw error;
    }
  }

  /**
   * Get ledger balances from ClearNode
   */
  async getLedgerBalances(channelId: string) {
    try {
      return await clearNodeService.getLedgerBalances(channelId);
    } catch (error) {
      logger.error('Failed to get ledger balances', error);
      throw error;
    }
  }

  /**
   * Encode deal ID into hex string for state data
   */
  private encodeDealId(dealId: bigint): string {
    return `0x${dealId.toString(16).padStart(64, '0')}`;
  }

  /**
   * Get ClearNode connection status
   */
  getConnectionStatus() {
    return clearNodeService.getStatus();
  }
}

// Export singleton instance
export const nitroliteService = new NitroliteService();
