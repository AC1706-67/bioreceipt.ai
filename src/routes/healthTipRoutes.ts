/**
 * HealthTip API Routes
 * Express routes for health tip management
 */
import { Router } from 'express';
import { healthTipController } from '../controllers/healthTipController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validationMiddleware } from '../middleware/validationMiddleware';
import { healthTipSchema } from '../validation/schemas';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
}));

/**
 * @route   GET /api/health-tips
 * @desc    Get paginated list of health tips with filtering and sorting
 * @access  Private
 * @query   page, limit, category, difficulty, search, sortBy, sortOrder
 */
router.get('/', healthTipController.getHealthTips.bind(healthTipController));

/**
 * @route   GET /api/health-tips/:id
 * @desc    Get a specific health tip by ID
 * @access  Private
 * @param   id - Health tip ID
 */
router.get('/:id', healthTipController.getHealthTipById.bind(healthTipController));

/**
 * @route   POST /api/health-tips
 * @desc    Create a new health tip
 * @access  Private
 * @body    HealthTip data (title, content, category, difficulty, etc.)
 */
router.post(
  '/',
  validationMiddleware(healthTipSchema),
  healthTipController.createHealthTip.bind(healthTipController)
);

/**
 * @route   PUT /api/health-tips/:id
 * @desc    Update an existing health tip
 * @access  Private
 * @param   id - Health tip ID
 * @body    Updated HealthTip data
 */
router.put(
  '/:id',
  validationMiddleware(healthTipSchema),
  healthTipController.updateHealthTip.bind(healthTipController)
);

/**
 * @route   DELETE /api/health-tips/:id
 * @desc    Delete a health tip (soft delete)
 * @access  Private
 * @param   id - Health tip ID
 */
router.delete('/:id', healthTipController.deleteHealthTip.bind(healthTipController));

/**
 * @route   GET /api/health-tips/stats
 * @desc    Get content statistics
 * @access  Private
 */
router.get('/stats', healthTipController.getContentStats.bind(healthTipController));

/**
 * @route   GET /api/health-tips/daily
 * @desc    Get daily personalized tips for authenticated user
 * @access  Private
 * @query   count - Number of tips to return (default: 3)
 */
router.get('/daily', healthTipController.getDailyTips.bind(healthTipController));

/**
 * @route   GET /api/health-tips/search
 * @desc    Search health tips
 * @access  Private
 * @query   q - Search query, limit - Number of results
 */
router.get('/search', healthTipController.searchHealthTips.bind(healthTipController));

/**
 * @route   GET /api/health-tips/category/:category
 * @desc    Get health tips by category
 * @access  Private
 * @param   category - Health tip category
 * @query   limit - Number of results
 */
router.get('/category/:category', healthTipController.getHealthTipsByCategory.bind(healthTipController));

/**
 * @route   GET /api/health-tips/:id/analytics
 * @desc    Get analytics for a specific health tip
 * @access  Private
 * @param   id - Health tip ID
 */
router.get('/:id/analytics', healthTipController.getContentAnalytics.bind(healthTipController));

/**
 * @route   POST /api/health-tips/bulk
 * @desc    Perform bulk operations on health tips
 * @access  Private
 * @body    { action, tipIds, data }
 */
router.post('/bulk', healthTipController.bulkOperation.bind(healthTipController));

/**
 * @route   POST /api/health-tips/:id/schedule
 * @desc    Schedule content for future publication
 * @access  Private
 * @param   id - Health tip ID
 * @body    { scheduledFor }
 */
router.post('/:id/schedule', healthTipController.scheduleContent.bind(healthTipController));

/**
 * @route   POST /api/health-tips/:id/view
 * @desc    Increment view count for a health tip
 * @access  Private
 * @param   id - Health tip ID
 */
router.post('/:id/view', healthTipController.incrementViewCount.bind(healthTipController));

/**
 * @route   POST /api/health-tips/:id/engage
 * @desc    Record user engagement with a health tip
 * @access  Private
 * @param   id - Health tip ID
 * @body    { action }
 */
router.post('/:id/engage', healthTipController.recordEngagement.bind(healthTipController));

export { router as healthTipRoutes };