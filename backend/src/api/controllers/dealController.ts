/**
 * Deal Controller
 */
import { Request, Response } from 'express';
import { getPrismaClient } from '../../services/database/prisma';
import { createModuleLogger } from '../../utils/logger';
import { nitroliteService } from '../../services/nitrolite/NitroliteService';

const logger = createModuleLogger('dealController');
const prisma = getPrismaClient();

/**
 * List all deals
 */
export async function listDeals(req: Request, res: Response) {
  try {
    const { status, limit = '50', offset = '0' } = req.query;
    
    const deals = await prisma.deal.findMany({
      where: status ? { status: status as any } : undefined,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        positions: true,
        channelState: true,
      },
    });
    
    res.json({
      success: true,
      count: deals.length,
      deals,
    });
  } catch (error) {
    logger.error('Error listing deals', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list deals',
    });
  }
}

/**
 * Get deal by ID
 */
export async function getDeal(req: Request, res: Response) {
  try {
    const dealId = BigInt(req.params.id);
    
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        positions: true,
        channelState: true,
        settlements: true,
      },
    });
    
    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      });
    }
    
    res.json({
      success: true,
      deal,
    });
  } catch (error) {
    logger.error('Error getting deal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deal',
    });
  }
}

/**
 * Create new deal
 */
export async function createDeal(req: Request, res: Response) {
  try {
    const {
      id,
      depositToken,
      targetToken,
      targetChainId,
      expectedYield,
      dealer,
    } = req.body;
    
    // Validate required fields
    if (!id || !depositToken || !targetToken || !targetChainId || !dealer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const deal = await prisma.deal.create({
      data: {
        id: BigInt(id),
        depositToken,
        targetToken,
        targetChainId: BigInt(targetChainId),
        status: 'CREATED',
        totalDeposited: 0,
        expectedYield: expectedYield || 0,
        dealer,
      },
    });
    
    logger.info('Deal created', { dealId: deal.id.toString() });
    
    res.status(201).json({
      success: true,
      deal,
    });
  } catch (error) {
    logger.error('Error creating deal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deal',
    });
  }
}

/**
 * Lock deal (Create Nitrolite channel)
 */
export async function lockDeal(req: Request, res: Response) {
  try {
    const dealId = BigInt(req.params.id);
    
    // Get deal with positions
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { positions: true },
    });
    
    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      });
    }
    
    if (deal.status !== 'CREATED') {
      return res.status(400).json({
        success: false,
        error: 'Deal must be in CREATED status',
      });
    }
    
    // Calculate total LP deposits and dealer amount
    const lpTotal = deal.totalDeposited;
    const dealerAmount = lpTotal; // 1:1 for simplicity
    
    // Create Nitrolite channel
    const { channelId } = await nitroliteService.createChannelForDeal(
      dealId,
      deal.dealer as `0x${string}`, // Participant 0: Dealer
      deal.dealer as `0x${string}`, // Participant 1: LP pool (using dealer as proxy)
      dealerAmount,
      lpTotal
    );
    
    // Update deal status
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        status: 'LOCKED',
        lockTimestamp: new Date(),
      },
    });
    
    logger.info('Deal locked with Nitrolite channel', {
      dealId: dealId.toString(),
      channelId,
    });
    
    res.json({
      success: true,
      deal: updatedDeal,
      channelId,
      message: 'Deal locked and channel created',
    });
  } catch (error) {
    logger.error('Error locking deal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock deal',
    });
  }
}

/**
 * Settle deal (Finalize Nitrolite channel)
 */
export async function settleDeal(req: Request, res: Response) {
  try {
    const dealId = BigInt(req.params.id);
    const { finalPrice, dealerFinal, lpFinal } = req.body;
    
    // Get channel state for this deal
    const channelState = await prisma.channelState.findUnique({
      where: { dealId },
    });
    
    if (!channelState) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found for deal',
      });
    }
    
    // Finalize Nitrolite channel
    await nitroliteService.finalizeChannel(
      channelState.channelId,
      BigInt(dealerFinal),
      BigInt(lpFinal)
    );
    
    // Update deal status
    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        status: 'SETTLED',
      },
    });
    
    // Create settlement record
    const settlement = await prisma.settlement.create({
      data: {
        dealId,
        finalPrice,
        priceSource: 'FTSO',
        dealerFinal,
        lpFinal,
        status: 'COMPLETED',
        settledAt: new Date(),
        channelId: channelState.channelId,
      },
    });
    
    logger.info('Deal settled with channel finalized', {
      dealId: dealId.toString(),
      channelId: channelState.channelId,
    });
    
    res.json({
      success: true,
      deal,
      settlement,
      channelId: channelState.channelId,
    });
  } catch (error) {
    logger.error('Error settling deal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to settle deal',
    });
  }
}

/**
 * Get positions for a deal
 */
export async function getDealPositions(req: Request, res: Response) {
  try {
    const dealId = BigInt(req.params.id);
    
    const positions = await prisma.position.findMany({
      where: { dealId },
      include: {
        remoteDeposit: true,
      },
    });
    
    res.json({
      success: true,
      count: positions.length,
      positions,
    });
  } catch (error) {
    logger.error('Error getting deal positions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get positions',
    });
  }
}
