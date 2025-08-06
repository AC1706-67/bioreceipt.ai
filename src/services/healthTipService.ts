/**
 * Health Tip Service
 * CRUD operations for health tips with validation and error handling
 */

import { HealthTip } from '../types/healthTip';
import { healthTipSchema, validateData } from '../validation/schemas';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errorHandler';

export interface PaginationOptions {
  page: number;
  limit: number;
  category?: string;
  difficulty?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateHealthTipData {
  title: string;
  content: string;
  category: string;
  difficulty: string;
  estimatedReadTime: number;
  tags?: string[];
  imageUrl?: string;
  createdBy: string;
  isActive?: boolean;
}

export interface UpdateHealthTipData extends Partial<CreateHealthTipData> {
  id: string;
}

class HealthTipService {
  /**
   * Get paginated list of health tips
   */
  async getHealthTips(options: PaginationOptions): Promise<PaginatedResponse<HealthTip>> {
    try {
      const { page = 1, limit = 10, category, difficulty, search } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('health_tips')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new AppError('Failed to fetch health tips', 500, 'DATABASE_ERROR', error);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch health tips', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Get a single health tip by ID
   */
  async getHealthTipById(id: string): Promise<HealthTip> {
    try {
      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      const { data, error } = await supabase
        .from('health_tips')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Health tip not found', 404, 'NOT_FOUND');
        }
        throw new AppError('Failed to fetch health tip', 500, 'DATABASE_ERROR', error);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch health tip', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Create a new health tip
   */
  async createHealthTip(tipData: CreateHealthTipData): Promise<HealthTip> {
    try {
      // Validate input data
      const validation = await validateData(healthTipSchema, {
        ...tipData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: tipData.isActive ?? true,
      });

      if (!validation.isValid) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.errors
        );
      }

      const validatedData = validation.data!;

      // Insert into database
      const { data, error } = await supabase
        .from('health_tips')
        .insert([{
          id: validatedData.id,
          title: validatedData.title,
          content: validatedData.content,
          category: validatedData.category,
          difficulty: validatedData.difficulty,
          estimated_read_time: validatedData.estimatedReadTime,
          tags: JSON.stringify(validatedData.tags || []),
          image_url: validatedData.imageUrl,
          created_by: validatedData.createdBy,
          is_active: validatedData.isActive,
          created_at: validatedData.createdAt.toISOString(),
          updated_at: validatedData.updatedAt.toISOString(),
        }])
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to create health tip', 500, 'DATABASE_ERROR', error);
      }

      return this.transformDatabaseRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create health tip', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Update an existing health tip
   */
  async updateHealthTip(updateData: UpdateHealthTipData): Promise<HealthTip> {
    try {
      const { id, ...tipData } = updateData;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      // Check if tip exists
      const existingTip = await this.getHealthTipById(id);

      // Validate update data
      const validation = await validateData(healthTipSchema.partial(), {
        ...tipData,
        updatedAt: new Date(),
      });

      if (!validation.isValid) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.errors
        );
      }

      const validatedData = validation.data!;

      // Prepare update object
      const updateObject: any = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.title) updateObject.title = validatedData.title;
      if (validatedData.content) updateObject.content = validatedData.content;
      if (validatedData.category) updateObject.category = validatedData.category;
      if (validatedData.difficulty) updateObject.difficulty = validatedData.difficulty;
      if (validatedData.estimatedReadTime) updateObject.estimated_read_time = validatedData.estimatedReadTime;
      if (validatedData.tags) updateObject.tags = JSON.stringify(validatedData.tags);
      if (validatedData.imageUrl !== undefined) updateObject.image_url = validatedData.imageUrl;
      if (validatedData.isActive !== undefined) updateObject.is_active = validatedData.isActive;

      // Update in database
      const { data, error } = await supabase
        .from('health_tips')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update health tip', 500, 'DATABASE_ERROR', error);
      }

      return this.transformDatabaseRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update health tip', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Delete a health tip (soft delete)
   */
  async deleteHealthTip(id: string): Promise<void> {
    try {
      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      // Check if tip exists
      await this.getHealthTipById(id);

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('health_tips')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new AppError('Failed to delete health tip', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete health tip', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Get health tips by category
   */
  async getHealthTipsByCategory(category: string, limit: number = 10): Promise<HealthTip[]> {
    try {
      const { data, error } = await supabase
        .from('health_tips')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new AppError('Failed to fetch health tips by category', 500, 'DATABASE_ERROR', error);
      }

      return (data || []).map(this.transformDatabaseRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch health tips by category', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Search health tips
   */
  async searchHealthTips(query: string, limit: number = 10): Promise<HealthTip[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      const { data, error } = await supabase
        .from('health_tips')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.ilike.%${query}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new AppError('Failed to search health tips', 500, 'DATABASE_ERROR', error);
      }

      return (data || []).map(this.transformDatabaseRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to search health tips', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Transform database record to HealthTip interface
   */
  private transformDatabaseRecord(record: any): HealthTip {
    return {
      id: record.id,
      title: record.title,
      content: record.content,
      category: record.category,
      difficulty: record.difficulty,
      estimatedReadTime: record.estimated_read_time,
      tags: record.tags ? JSON.parse(record.tags) : [],
      imageUrl: record.image_url,
      createdBy: record.created_by,
      isActive: record.is_active,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export const healthTipService = new HealthTipService();