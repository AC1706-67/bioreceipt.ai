/**
 * Validation Middleware
 * Express middleware for request validation using Joi schemas
 */
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { validateData } from '../validation/schemas';
import { ApiResponse } from '../types/api';

/**
 * Creates validation middleware for request body validation
 */
export const validationMiddleware = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = await validateData(schema, req.body);
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.errors,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      // Replace request body with validated data
      req.body = validation.data;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Validation processing failed',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  };
};

/**
 * Creates validation middleware for query parameters
 */
export const queryValidationMiddleware = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = await validateData(schema, req.query);
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.errors,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      // Replace query with validated data
      req.query = validation.data as any;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Query validation processing failed',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  };
};

/**
 * Creates validation middleware for URL parameters
 */
export const paramValidationMiddleware = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = await validateData(schema, req.params);
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL parameters',
            details: validation.errors,
          },
          timestamp: new Date(),
        } as ApiResponse<null>);
        return;
      }

      // Replace params with validated data
      req.params = validation.data as any;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Parameter validation processing failed',
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
    }
  };
};