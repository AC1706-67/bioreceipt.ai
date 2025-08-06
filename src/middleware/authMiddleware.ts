/**
 * Authentication Middleware
 * Express middleware for JWT token validation and user authentication
 */
import { Request, Response, NextFunction } from 'express';
import { tokenManager } from '../utils/tokenManager';
import { authService } from '../services/auth/authService';
import { ApiResponse } from '../types/api';
import { loggingService } from '../services/logging/loggingService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        permissions?: string[];
      };
    }
  }
}

/**
 * Main authentication middleware
 * Validates JWT token and attaches user info to request
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    const tokenValidation = await tokenManager.validateToken(token);
    if (!tokenValidation.isValid || !tokenValidation.payload) {
      await loggingService.logWarning('Invalid token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Get user details
    const user = await authService.getUserById(tokenValidation.payload.userId);
    if (!user) {
      await loggingService.logWarning('Token valid but user not found', {
        userId: tokenValidation.payload.userId,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token not found',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      await loggingService.logWarning('Inactive user attempted access', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    // Log successful authentication
    await loggingService.logInfo('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    await loggingService.logError('Authentication middleware error', error as Error, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication processing failed',
      },
      timestamp: new Date(),
    } as ApiResponse<null>);
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present and valid, but doesn't require it
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user info
      next();
      return;
    }

    const token = authHeader.substring(7);
    const tokenValidation = await tokenManager.validateToken(token);
    
    if (tokenValidation.isValid && tokenValidation.payload) {
      const user = await authService.getUserById(tokenValidation.payload.userId);
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        };
      }
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    await loggingService.logWarning('Optional authentication failed', {
      error: (error as Error).message,
      path: req.path,
    });
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires specific role(s) to access the endpoint
 */
export const requireRole = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    if (!req.user.role || !requiredRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          details: {
            required: requiredRoles,
            current: req.user.role,
          },
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * Requires specific permission(s) to access the endpoint
 */
export const requirePermission = (permissions: string | string[]) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          details: {
            required: requiredPermissions,
            current: userPermissions,
          },
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    next();
  };
};