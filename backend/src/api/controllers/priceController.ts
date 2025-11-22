/**
 * Price Controller
 */
import { Request, Response } from 'express';
import { getPrismaClient } from '../../services/database/prisma';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('priceController');
const prisma = getPrismaClient();

/**
 * Get current price for token
 */
export async function getPrice(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    
    // Get latest price from database
    const latestPrice = await prisma.priceHistory.findFirst({
      where: { tokenSymbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' },
    });
    
    if (!latestPrice) {
      return res.status(404).json({
        success: false,
        error: `Price not found for ${symbol}`,
      });
    }
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      price: latestPrice.price.toString(),
      timestamp: latestPrice.timestamp,
      source: latestPrice.source,
    });
  } catch (error) {
    logger.error('Error getting price', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price',
    });
  }
}

/**
 * Get price history
 */
export async function getPriceHistory(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    const { limit = '100', offset = '0' } = req.query;
    
    const history = await prisma.priceHistory.findMany({
      where: { tokenSymbol: symbol.toUpperCase() },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: history.length,
      history,
    });
  } catch (error) {
    logger.error('Error getting price history', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price history',
    });
  }
}
