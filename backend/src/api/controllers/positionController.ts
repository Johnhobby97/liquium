/**
 * Position Controller
 */
import { Request, Response } from 'express';
import { getPrismaClient } from '../../services/database/prisma';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('positionController');
const prisma = getPrismaClient();

/**
 * List all positions
 */
export async function listPositions(req: Request, res: Response) {
  try {
    const { owner, dealId, limit = '50', offset = '0' } = req.query;
    
    const positions = await prisma.position.findMany({
      where: {
        ...(owner && { owner: owner as string }),
        ...(dealId && { dealId: BigInt(dealId as string) }),
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        deal: true,
        remoteDeposit: true,
      },
    });
    
    res.json({
      success: true,
      count: positions.length,
      positions,
    });
  } catch (error) {
    logger.error('Error listing positions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list positions',
    });
  }
}

/**
 * Get position by ID
 */
export async function getPosition(req: Request, res: Response) {
  try {
    const positionId = BigInt(req.params.id);
    
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        deal: true,
        remoteDeposit: true,
      },
    });
    
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }
    
    res.json({
      success: true,
      position,
    });
  } catch (error) {
    logger.error('Error getting position', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get position',
    });
  }
}

/**
 * Create new position (deposit)
 */
export async function createPosition(req: Request, res: Response) {
  try {
    const {
      id,
      dealId,
      owner,
      depositAmount,
      tokenAddress,
      chainId,
    } = req.body;
    
    // Validate required fields
    if (!id || !dealId || !owner || !depositAmount || !tokenAddress || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const position = await prisma.position.create({
      data: {
        id: BigInt(id),
        dealId: BigInt(dealId),
        owner,
        depositAmount,
        tokenAddress,
        chainId: BigInt(chainId),
        claimed: false,
      },
    });
    
    // Update deal's total deposited
    await prisma.deal.update({
      where: { id: BigInt(dealId) },
      data: {
        totalDeposited: {
          increment: depositAmount,
        },
      },
    });
    
    logger.info('Position created', { positionId: position.id.toString() });
    
    res.status(201).json({
      success: true,
      position,
    });
  } catch (error) {
    logger.error('Error creating position', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create position',
    });
  }
}

/**
 * Withdraw from position
 */
export async function withdrawPosition(req: Request, res: Response) {
  try {
    const positionId = BigInt(req.params.id);
    const { claimAmount } = req.body;
    
    const position = await prisma.position.update({
      where: { id: positionId },
      data: {
        claimed: true,
        claimAmount,
      },
    });
    
    logger.info('Position withdrawn', { positionId: position.id.toString() });
    
    // TODO: Trigger actual blockchain withdrawal
    
    res.json({
      success: true,
      position,
      message: 'Withdrawal processed',
    });
  } catch (error) {
    logger.error('Error withdrawing position', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw position',
    });
  }
}
