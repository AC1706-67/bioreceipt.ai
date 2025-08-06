/**
 * Personalization API Routes
 * Express routes for AI-powered personalization
 */
import { Router } from 'express';
import { personalizationController } from '../controllers/personalizationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting (more restrictive for AI endpoints)
router.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each user to 30 AI requests per 15 minutes
  message: 'Too many personalization requests, please try again later.',
}));

/**
 * @route   GET /api/personalization/tips
 * @desc    Get personalized health tips for the authenticated user
 * @access  Private
 * @query   count (1-10), refresh (boolean)
 */
router.get('/tips', personalizationController.getPersonalizedTips.bind(personalizationController));

/**
 * @route   POST /api/personalization/feedback
 * @desc    Record user feedback on personalized recommendations
 * @access  Private
 * @body    { tipId, feedback: 'positive'|'negative', reasoning? }
 */
router.post('/feedback', personalizationController.recordPersonalizationFeedback.bind(personalizationController));

/**
 * @route   GET /api/personalization/profile
 * @desc    Get user's personalization profile and preferences
 * @access  Private
 */
router.get('/profile', personalizationController.getPersonalizationProfile.bind(personalizationController));

/**
 * @route   PUT /api/personalization/preferences
 * @desc    Update user's personalization preferences
 * @access  Private
 * @body    User preferences object
 */
router.put('/preferences', personalizationController.updatePersonalizationPreferences.bind(personalizationController));

export { router as personalizationRoutes };