/**
 * Profile Controller
 * Handles user profile and onboarding API endpoints
 */
import { Request, Response } from 'express';
import { profileService } from '../services/profile/profileService';
import { validateData } from '../validation/schemas';
import { onboardingDataSchema, profileUpdateSchema } from '../validation/schemas';
import { ApiResponse } from '../types/api';
import { UserProfile, OnboardingData, ProfileUpdateData } from '../types/userProfile';
import { loggingService } from '../services/logging/loggingService';

export class ProfileController {
  /**
   * GET /api/profile
   * Get current user's profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
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

      const profile = await profileService.getUserProfile(userId);
      
      if (!profile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'User profile not found',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: profile,
        timestamp: new Date(),
      } as ApiResponse<UserProfile>);

      await loggingService.logInfo('User profile retrieved', {
        userId,
        onboardingCompleted: profile.onboardingCompleted,
      });
    } catch (error) {
      await loggingService.logError('Failed to get user profile', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve profile',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * PUT /api/profile
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
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

      // Validate request body
      const validation = await validateData(profileUpdateSchema, req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile data',
            details: validation.errors,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const updatedProfile = await profileService.updateUserProfile(userId, validation.data!);

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully',
        timestamp: new Date(),
      } as ApiResponse<UserProfile>);

      await loggingService.logInfo('User profile updated', {
        userId,
        updatedFields: Object.keys(validation.data!),
      });
    } catch (error) {
      await loggingService.logError('Failed to update user profile', error as Error, {
        userId: req.user?.id,
        requestBody: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/profile/onboarding
   * Get onboarding progress
   */
  async getOnboardingProgress(req: Request, res: Response): Promise<void> {
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

      const progress = await profileService.getOnboardingProgress(userId);

      res.status(200).json({
        success: true,
        data: progress,
        timestamp: new Date(),
      } as ApiResponse<any>);
    } catch (error) {
      await loggingService.logError('Failed to get onboarding progress', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve onboarding progress',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * POST /api/profile/onboarding
   * Update onboarding progress and data
   */
  async updateOnboardingProgress(req: Request, res: Response): Promise<void> {
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

      // Validate request body
      const validation = await validateData(onboardingDataSchema, req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid onboarding data',
            details: validation.errors,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const updatedProgress = await profileService.updateOnboardingProgress(
        userId,
        validation.data!
      );

      res.status(200).json({
        success: true,
        data: updatedProgress,
        message: 'Onboarding progress updated successfully',
        timestamp: new Date(),
      } as ApiResponse<any>);

      await loggingService.logInfo('Onboarding progress updated', {
        userId,
        currentStep: validation.data!.currentStep,
        completedSteps: validation.data!.completedSteps,
      });
    } catch (error) {
      await loggingService.logError('Failed to update onboarding progress', error as Error, {
        userId: req.user?.id,
        requestBody: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update onboarding progress',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * POST /api/profile/onboarding/complete
   * Complete onboarding process
   */
  async completeOnboarding(req: Request, res: Response): Promise<void> {
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

      const completedProfile = await profileService.completeOnboarding(userId);

      res.status(200).json({
        success: true,
        data: completedProfile,
        message: 'Onboarding completed successfully! Welcome to your wellness journey! 🎉',
        timestamp: new Date(),
      } as ApiResponse<UserProfile>);

      await loggingService.logInfo('User onboarding completed', {
        userId,
        completedAt: new Date(),
      });
    } catch (error) {
      await loggingService.logError('Failed to complete onboarding', error as Error, {
        userId: req.user?.id,
      });

      if ((error as any).code === 'ONBOARDING_INCOMPLETE') {
        res.status(400).json({
          success: false,
          error: {
            code: 'ONBOARDING_INCOMPLETE',
            message: 'Please complete all onboarding steps before finishing',
            details: (error as any).missingSteps,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete onboarding',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/profile/health-interests
   * Get user's health interests
   */
  async getHealthInterests(req: Request, res: Response): Promise<void> {
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

      const healthInterests = await profileService.getHealthInterests(userId);

      res.status(200).json({
        success: true,
        data: healthInterests,
        timestamp: new Date(),
      } as ApiResponse<any>);
    } catch (error) {
      await loggingService.logError('Failed to get health interests', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve health interests',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * PUT /api/profile/health-interests
   * Update user's health interests
   */
  async updateHealthInterests(req: Request, res: Response): Promise<void> {
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

      const { healthInterests } = req.body;

      if (!Array.isArray(healthInterests)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Health interests must be an array',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const updatedInterests = await profileService.updateHealthInterests(userId, healthInterests);

      res.status(200).json({
        success: true,
        data: updatedInterests,
        message: 'Health interests updated successfully',
        timestamp: new Date(),
      } as ApiResponse<any>);

      await loggingService.logInfo('Health interests updated', {
        userId,
        interestCount: healthInterests.length,
        categories: healthInterests.map((hi: any) => hi.category),
      });
    } catch (error) {
      await loggingService.logError('Failed to update health interests', error as Error, {
        userId: req.user?.id,
        requestBody: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update health interests',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/profile/goals
   * Get user's goals
   */
  async getGoals(req: Request, res: Response): Promise<void> {
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

      const goals = await profileService.getUserGoals(userId);

      res.status(200).json({
        success: true,
        data: goals,
        timestamp: new Date(),
      } as ApiResponse<any>);
    } catch (error) {
      await loggingService.logError('Failed to get user goals', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve goals',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * PUT /api/profile/goals
   * Update user's goals
   */
  async updateGoals(req: Request, res: Response): Promise<void> {
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

      const { goals } = req.body;

      if (!Array.isArray(goals)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Goals must be an array',
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      const updatedGoals = await profileService.updateUserGoals(userId, goals);

      res.status(200).json({
        success: true,
        data: updatedGoals,
        message: 'Goals updated successfully',
        timestamp: new Date(),
      } as ApiResponse<any>);

      await loggingService.logInfo('User goals updated', {
        userId,
        goalCount: goals.length,
        goalTypes: goals,
      });
    } catch (error) {
      await loggingService.logError('Failed to update user goals', error as Error, {
        userId: req.user?.id,
        requestBody: req.body,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update goals',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }

  /**
   * DELETE /api/profile
   * Delete user profile (GDPR compliance)
   */
  async deleteProfile(req: Request, res: Response): Promise<void> {
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

      await profileService.deleteUserProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully. We\'re sorry to see you go! 👋',
        timestamp: new Date(),
      } as ApiResponse<null>);

      await loggingService.logInfo('User profile deleted', {
        userId,
        deletedAt: new Date(),
      });
    } catch (error) {
      await loggingService.logError('Failed to delete user profile', error as Error, {
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete profile',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  }
}

// Export singleton instance
export const profileController = new ProfileController();