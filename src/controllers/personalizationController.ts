/**
 * Personalization Controller
 * Handles AI-powered personalized health tip recommendations
 */
import { Request, Response } from 'express';
import { personalizationService } from '../services/personalization/personalizationService';
import { healthTipService } from '../services/healthTipService';
import { authService } from '../services/auth/authService';
import { loggingService } from '../services/logging/loggingService';
import { ApiResponse } from '../types/api';
import { HealthTip } from '../types/healthTip';

export class PersonalizationController {
  /**
   * GET /api/personalization/tips
   * Get personalized health tips for the authenticated user
   */
  async getPersonalizedTips(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required for personalization',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const count = parseInt(req.query.count as string) || 3;
      const forceRefresh = req.query.refresh === 'true';

      // Validate count parameter
      if (count < 1 || count > 10) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Count must be between 1 and 10',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const startTime = Date.now();

      // Get personalized tips
      const personalizedTips = await personalizationService.getPersonalizedTips(
        userId,
        count,
        forceRefresh
      );

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          tips: personalizedTips.tips,
          personalizationScore: personalizedTips.personalizationScore,
          reasoning: personalizedTips.reasoning,
          fallbackUsed: personalizedTips.fallbackUsed,
          processingTimeMs: processingTime,
        },
        timestamp: new Date(),
      } as ApiResponse<any>);

      // Log successful personalization
      await loggingService.logInfo('Personalized tips generated successfully', {
        userId,
        count,
        personalizationScore: personalizedTips.personalizationScore,
        fallbackUsed: personalizedTips.fallbackUsed,
        processingTimeMs: processingTime,
      });
    } catch (error) {
      await loggingService.logError('Failed to generate personalized tips', error as Error, {
        userId: req.user?.id,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PERSONALIZATION_ERROR',
          message: 'Failed to generate personalized recommendations',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * POST /api/personalization/feedback
   * Record user feedback on personalized recommendations
   */
  async recordPersonalizationFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const { tipId, feedback, reasoning } = req.body;

      // Validate feedback data
      if (!tipId || !feedback || !['positive', 'negative'].includes(feedback)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FEEDBACK',
            message: 'Valid tipId and feedback (positive/negative) are required',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      // Record the feedback
      await personalizationService.recordPersonalizationFeedback({
        userId,
        tipId,
        feedback,
        reasoning: reasoning || null,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Feedback recorded successfully',
        timestamp: new Date(),
      } as ApiResponse<null>);

      await loggingService.logInfo('Personalization feedback recorded', {
        userId,
        tipId,
        feedback,
      });
    } catch (error) {
      await loggingService.logError('Failed to record personalization feedback', error as Error, {
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'FEEDBACK_ERROR',
          message: 'Failed to record feedback',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/personalization/profile
   * Get user's personalization profile and preferences
   */
  async getPersonalizationProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const profile = await personalizationService.getUserPersonalizationProfile(userId);

      res.status(200).json({
        success: true,
        data: profile,
        timestamp: new Date(),
      } as ApiResponse<any>);
    } catch (error) {
      await loggingService.logError('Failed to get personalization profile', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: 'Failed to retrieve personalization profile',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * PUT /api/personalization/preferences
   * Update user's personalization preferences
   */
  async updatePersonalizationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const preferences = req.body;

      // Update preferences
      const updatedProfile = await personalizationService.updatePersonalizationPreferences(
        userId,
        preferences
      );

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Preferences updated successfully',
        timestamp: new Date(),
      } as ApiResponse<any>);

      await loggingService.logInfo('Personalization preferences updated', {
        userId,
        preferences,
      });
    } catch (error) {
      await loggingService.logError('Failed to update personalization preferences', error as Error, {
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_ERROR',
          message: 'Failed to update preferences',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }
}

// Export singleton instance
export const personalizationController = new PersonalizationController();