/**
 * Deal API Routes
 */
import { Router } from 'express';
import * as dealController from '../controllers/dealController';

const router = Router();

/**
 * @route   GET /api/deals
 * @desc    List all deals
 * @query   status, limit, offset
 */
router.get('/', dealController.listDeals);

/**
 * @route   GET /api/deals/:id
 * @desc    Get deal by ID
 */
router.get('/:id', dealController.getDeal);

/**
 * @route   POST /api/deals
 * @desc    Create new deal
 * @body    depositToken, targetToken, targetChainId, expectedYield, dealer
 */
router.post('/', dealController.createDeal);

/**
 * @route   POST /api/deals/:id/lock
 * @desc    Lock deal (start channel)
 */
router.post('/:id/lock', dealController.lockDeal);

/**
 * @route   POST /api/deals/:id/settle
 * @desc    Settle deal
 */
router.post('/:id/settle', dealController.settleDeal);

/**
 * @route   GET /api/deals/:id/positions
 * @desc    Get all positions for a deal
 */
router.get('/:id/positions', dealController.getDealPositions);

export default router;
