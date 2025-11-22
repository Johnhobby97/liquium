/**
 * Price API Routes
 */
import { Router } from 'express';
import * as priceController from '../controllers/priceController';

const router = Router();

/**
 * @route   GET /api/prices/:symbol
 * @desc    Get current price for token symbol
 */
router.get('/:symbol', priceController.getPrice);

/**
 * @route   GET /api/prices/:symbol/history
 * @desc    Get price history
 */
router.get('/:symbol/history', priceController.getPriceHistory);

export default router;
