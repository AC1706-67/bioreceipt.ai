/**
 * Profile API Routes
 * Express routes for user profile and onboarding management
 */
import { Router } from 'express';
import { profileController } from '../controllers/profileController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 requests per 15 minutes
  message: 'Too many profile requests, please try again later.',
}));

/**
 * @route   GET /api/profile
 * @desc    Get current user's complete profile
 * @access  Private
 */
router.get('/', profileController.getProfile.bind(profileController));

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 * @body    ProfileUpdateData (name, age, gender, healthInterests, goals, preferences)
 */
router.put('/', profileController.updateProfile.bind(profileController));

/**
 * @route   DELETE /api/profile
 * @desc    Delete user profile (GDPR compliance)
 * @access  Private
 */
router.delete('/', profileController.deleteProfile.bind(profileController));

/**
 * @route   GET /api/profile/onboarding
 * @desc    Get onboarding progress and data
 * @access  Private
 */
router.get('/onboarding', profileController.getOnboardingProgress.bind(profileController));

/**
 * @route   POST /api/profile/onboarding
 * @desc    Update onboarding progress and save step data
 * @access  Private
 * @body    OnboardingData (currentStep, completedSteps, form data)
 */
router.post('/onboarding', profileController.updateOnboardingProgress.bind(profileController));

/**
 * @route   POST /api/profile/onboarding/complete
 * @desc    Complete onboarding process
 * @access  Private
 */
router.post('/onboarding/complete', profileController.completeOnboarding.bind(profileController));

/**
 * @route   GET /api/profile/health-interests
 * @desc    Get user's health interests
 * @access  Private
 */
router.get('/health-interests', profileController.getHealthInterests.bind(profileController));

/**
 * @route   PUT /api/profile/health-interests
 * @desc    Update user's health interests
 * @access  Private
 * @body    { healthInterests: HealthInterest[] }
 */
router.put('/health-interests', profileController.updateHealthInterests.bind(profileController));

/**
 * @route   GET /api/profile/goals
 * @desc    Get user's goals
 * @access  Private
 */
router.get('/goals', profileController.getGoals.bind(profileController));

/**
 * @route   PUT /api/profile/goals
 * @desc    Update user's goals
 * @access  Private
 * @body    { goals: string[] }
 */
router.put('/goals', profileController.updateGoals.bind(profileController));

export { router as profileRoutes };