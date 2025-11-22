/**
 * Position API Routes
 */
import { Router } from 'express';
import * as positionController from '../controllers/positionController';

const router = Router();

/**
 * @route   GET /api/positions
 * @desc    List all positions
 * @query   owner, dealId, limit, offset
 */
router.get('/', positionController.listPositions);

/**
 * @route   GET /api/positions/:id
 * @desc    Get position by ID
 */
router.get('/:id', positionController.getPosition);

/**
 * @route   POST /api/positions
 * @desc    Create new position (deposit)
 */
router.post('/', positionController.createPosition);

/**
 * @route   POST /api/positions/:id/withdraw
 * @desc    Withdraw from position
 */
router.post('/:id/withdraw', positionController.withdrawPosition);

export default router;
