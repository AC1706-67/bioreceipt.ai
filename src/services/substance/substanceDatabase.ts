/**
 * Substance Database Service
 * Manages the comprehensive database of substances for BioPulse.AI
 */

import {
  Substance,
  SubstanceCategory,
  ToxicityLevel,
  AddictionPotential,
  LegalStatus,
  COMMON_SUBSTANCES
} from '../../models/Substance';
import { NewSubstance, ValidationResult } from '../../models/NewSubstance';
import { validateNewSubstance, sanitizeNewSubstance, isDuplicateName } from '../../utils/substanceValidation';
import { supabaseHelpers, Database } from '../../config/supabase';
import { storage } from '../../utils/storage';
import { SubstanceErrorHandler, SubstanceError } from '../error/substanceErrorHandler';
import { withRetry, createSubstanceRetryOptions } from '../../utils/retryMechanism';

class SubstanceDatabaseService {
  private static instance: SubstanceDatabaseService;
  private substances: Map<string, Substance> = new Map();
  private searchIndex: Map<string, string[]> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SubstanceDatabaseService {
    if (!SubstanceDatabaseService.instance) {
      SubstanceDatabaseService.instance = new SubstanceDatabaseService();
    }
    return SubstanceDatabaseService.instance;
  }

  /**
   * Initialize the substance database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load substances from storage
      await this.loadSubstancesFromStorage();
      
      // If no substances loaded, initialize with defaults
      if (this.substances.size === 0) {
        await this.initializeDefaultSubstances();
      }
      
      // Build search index
      this.buildSearchIndex();
      
      this.isInitialized = true;
      console.log(`Substance database initialized with ${this.substances.size} substances`);
    } catch (error) {
      console.error('Failed to initialize substance database:', error);
      throw error;
    }
  }

  /**
   * Search substances by name or category
   */
  searchSubstances(query: string, category?: SubstanceCategory, limit: number = 20): Substance[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return this.getSubstancesByCategory(category).slice(0, limit);
    }

    const results: { substance: Substance; score: number }[] = [];

    for (const substance of this.substances.values()) {
      // Skip if category filter doesn't match
      if (category && substance.category !== category) {
        continue;
      }

      let score = 0;

      // Exact name match gets highest score
      if (substance.name.toLowerCase() === normalizedQuery) {
        score += 100;
      }
      // Name starts with query
      else if (substance.name.toLowerCase().startsWith(normalizedQuery)) {
        score += 80;
      }
      // Name contains query
      else if (substance.name.toLowerCase().includes(normalizedQuery)) {
        score += 60;
      }

      // Check common names
      for (const commonName of substance.commonNames) {
        if (commonName.toLowerCase() === normalizedQuery) {
          score += 90;
        } else if (commonName.toLowerCase().startsWith(normalizedQuery)) {
          score += 70;
        } else if (commonName.toLowerCase().includes(normalizedQuery)) {
          score += 50;
        }
      }

      // Check tags
      for (const tag of substance.tags) {
        if (tag.toLowerCase().includes(normalizedQuery)) {
          score += 30;
        }
      }

      if (score > 0) {
        results.push({ substance, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.substance);
  }

  /**
   * Get substance by ID
   */
  getSubstanceById(id: string): Substance | null {
    return this.substances.get(id) || null;
  }

  /**
   * Get substances by category
   */
  getSubstancesByCategory(category?: SubstanceCategory): Substance[] {
    const substances = Array.from(this.substances.values());
    
    if (!category) {
      return substances;
    }
    
    return substances.filter(substance => substance.category === category);
  }

  /**
   * Add new substance to database
   */
  async addSubstance(substance: Omit<Substance, 'id' | 'lastUpdated'>): Promise<Substance> {
    const newSubstance: Substance = {
      ...substance,
      id: this.generateSubstanceId(),
      lastUpdated: new Date()
    };

    this.substances.set(newSubstance.id, newSubstance);
    this.updateSearchIndex(newSubstance);
    
    await this.saveSubstancesToStorage();
    
    return newSubstance;
  }

  /**
   * Update existing substance
   */
  async updateSubstance(id: string, updates: Partial<Substance>): Promise<Substance | null> {
    const existing = this.substances.get(id);
    if (!existing) {
      return null;
    }

    const updated: Substance = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      lastUpdated: new Date()
    };

    this.substances.set(id, updated);
    this.updateSearchIndex(updated);
    
    await this.saveSubstancesToStorage();
    
    return updated;
  }

  /**
   * Delete substance from database
   */
  async deleteSubstance(id: string): Promise<boolean> {
    const deleted = this.substances.delete(id);
    
    if (deleted) {
      this.removeFromSearchIndex(id);
      await this.saveSubstancesToStorage();
    }
    
    return deleted;
  }

  /**
   * Get substance interaction information
   */
  getSubstanceInteractions(substanceId: string): Substance['interactions'] {
    const substance = this.substances.get(substanceId);
    return substance?.interactions || [];
  }

  /**
   * Check for dangerous interactions between substances
   */
  checkInteractions(substanceIds: string[]): {
    dangerous: Array<{ substance1: string; substance2: string; description: string; severity: string }>;
    cautions: Array<{ substance1: string; substance2: string; description: string; severity: string }>;
  } {
    const dangerous: Array<{ substance1: string; substance2: string; description: string; severity: string }> = [];
    const cautions: Array<{ substance1: string; substance2: string; description: string; severity: string }> = [];

    for (let i = 0; i < substanceIds.length; i++) {
      for (let j = i + 1; j < substanceIds.length; j++) {
        const substance1 = this.substances.get(substanceIds[i]);
        const substance2 = this.substances.get(substanceIds[j]);

        if (!substance1 || !substance2) continue;

        // Check interactions from substance1 to substance2
        const interaction1 = substance1.interactions.find(
          int => int.substanceId === substanceIds[j]
        );

        // Check interactions from substance2 to substance1
        const interaction2 = substance2.interactions.find(
          int => int.substanceId === substanceIds[i]
        );

        const interaction = interaction1 || interaction2;

        if (interaction) {
          const interactionInfo = {
            substance1: substance1.name,
            substance2: substance2.name,
            description: interaction.description,
            severity: interaction.severity
          };

          if (interaction.interactionType === 'dangerous') {
            dangerous.push(interactionInfo);
          } else if (interaction.interactionType === 'caution') {
            cautions.push(interactionInfo);
          }
        }
      }
    }

    return { dangerous, cautions };
  }

  /**
   * Get popular substances by category
   */
  getPopularSubstances(category?: SubstanceCategory, limit: number = 10): Substance[] {
    // This would typically be based on usage statistics
    // For now, return verified substances first
    const substances = this.getSubstancesByCategory(category);
    
    return substances
      .filter(substance => substance.verified)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  /**
   * Initialize default substances
   */
  private async initializeDefaultSubstances(): Promise<void> {
    const defaultSubstances = this.createDefaultSubstances();
    
    for (const substance of defaultSubstances) {
      this.substances.set(substance.id, substance);
    }
    
    await this.saveSubstancesToStorage();
  }

  /**
   * Create default substance entries
   */
  private createDefaultSubstances(): Substance[] {
    const substances: Substance[] = [];
    const now = new Date();

    // Alcohol substances
    substances.push({
      id: 'alcohol_beer',
      name: 'Beer',
      commonNames: ['beer', 'lager', 'ale', 'stout', 'pilsner'],
      category: SubstanceCategory.ALCOHOL,
      subcategory: 'fermented',
      description: 'Fermented alcoholic beverage made from grains',
      commonUnits: ['ml', 'oz', 'pint', 'bottle', 'can'],
      dosageInfo: [{
        unit: 'ml',
        light: 250,
        common: 500,
        strong: 750,
        heavy: 1000,
        dangerous: 2000
      }],
      safetyProfile: {
        toxicityLevel: ToxicityLevel.LOW,
        addictionPotential: AddictionPotential.MEDIUM,
        legalStatus: LegalStatus.LEGAL,
        commonSideEffects: ['dehydration', 'impaired judgment', 'drowsiness'],
        dangerousInteractions: ['depressants', 'medications'],
        contraindications: ['pregnancy', 'liver disease', 'certain medications'],
        pregnancySafety: 'avoid',
        breastfeedingSafety: 'avoid'
      },
      pharmacology: {
        halfLife: 1,
        peakEffect: 0.5,
        duration: 4,
        onsetTime: 0.25,
        bioavailability: 80,
        metabolism: ['liver'],
        excretion: ['kidneys', 'lungs', 'skin']
      },
      interactions: [],
      tags: ['alcohol', 'social', 'depressant'],
      verified: true,
      lastUpdated: now,
      sources: ['internal']
    });

    // Caffeine
    substances.push({
      id: 'stimulant_caffeine',
      name: 'Caffeine',
      commonNames: ['caffeine', 'coffee', 'tea', 'energy drink'],
      category: SubstanceCategory.SUPPLEMENTS,
      subcategory: 'stimulant',
      description: 'Central nervous system stimulant',
      commonUnits: ['mg', 'cup', 'tablet', 'ml'],
      dosageInfo: [{
        unit: 'mg',
        threshold: 20,
        light: 50,
        common: 100,
        strong: 200,
        heavy: 400,
        dangerous: 800
      }],
      safetyProfile: {
        toxicityLevel: ToxicityLevel.LOW,
        addictionPotential: AddictionPotential.LOW,
        legalStatus: LegalStatus.LEGAL,
        commonSideEffects: ['jitters', 'anxiety', 'insomnia', 'increased heart rate'],
        dangerousInteractions: ['stimulants', 'certain medications'],
        contraindications: ['heart conditions', 'anxiety disorders'],
        pregnancySafety: 'caution',
        breastfeedingSafety: 'caution'
      },
      pharmacology: {
        halfLife: 5,
        peakEffect: 1,
        duration: 6,
        onsetTime: 0.25,
        bioavailability: 99,
        metabolism: ['liver'],
        excretion: ['kidneys']
      },
      interactions: [],
      tags: ['stimulant', 'nootropic', 'common'],
      verified: true,
      lastUpdated: now,
      sources: ['internal']
    });

    return substances;
  }

  /**
   * Build search index for fast searching
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();

    for (const substance of this.substances.values()) {
      const searchTerms = [
        substance.name.toLowerCase(),
        ...substance.commonNames.map(name => name.toLowerCase()),
        ...substance.tags.map(tag => tag.toLowerCase()),
        substance.category.toLowerCase()
      ];

      for (const term of searchTerms) {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, []);
        }
        this.searchIndex.get(term)!.push(substance.id);
      }
    }
  }

  /**
   * Update search index for a substance
   */
  private updateSearchIndex(substance: Substance): void {
    // Remove old entries
    this.removeFromSearchIndex(substance.id);

    // Add new entries
    const searchTerms = [
      substance.name.toLowerCase(),
      ...substance.commonNames.map(name => name.toLowerCase()),
      ...substance.tags.map(tag => tag.toLowerCase()),
      substance.category.toLowerCase()
    ];

    for (const term of searchTerms) {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, []);
      }
      this.searchIndex.get(term)!.push(substance.id);
    }
  }

  /**
   * Remove substance from search index
   */
  private removeFromSearchIndex(substanceId: string): void {
    for (const [term, ids] of this.searchIndex.entries()) {
      const index = ids.indexOf(substanceId);
      if (index > -1) {
        ids.splice(index, 1);
        if (ids.length === 0) {
          this.searchIndex.delete(term);
        }
      }
    }
  }

  /**
   * Load substances from storage
   */
  private async loadSubstancesFromStorage(): Promise<void> {
    try {
      const stored = await storage.getData('SUBSTANCE_DATABASE');
      if (stored && Array.isArray(stored)) {
        for (const substanceData of stored) {
          const substance: Substance = {
            ...substanceData,
            lastUpdated: new Date(substanceData.lastUpdated)
          };
          this.substances.set(substance.id, substance);
        }
      }
    } catch (error) {
      console.error('Failed to load substances from storage:', error);
    }
  }

  /**
   * Save substances to storage
   */
  private async saveSubstancesToStorage(): Promise<void> {
    try {
      const substancesArray = Array.from(this.substances.values());
      await storage.storeData('SUBSTANCE_DATABASE', substancesArray);
    } catch (error) {
      console.error('Failed to save substances to storage:', error);
    }
  }

  /**
   * Generate unique substance ID
   */
  private generateSubstanceId(): string {
    return `substance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add custom substance to Supabase database with comprehensive error handling and retry logic
   */
  async addCustomSubstance(
    newSubstance: NewSubstance,
    onRetry?: (attemptNumber: number, error: SubstanceError) => void
  ): Promise<{
    success: boolean;
    data?: Database['public']['Tables']['substances']['Row'] & {
      substance_categories: { id: string; name: string };
    };
    error?: string;
    validationErrors?: ValidationResult['errors'];
    substanceError?: SubstanceError;
  }> {
    try {
      // 1. Validate the substance data
      const validation = validateNewSubstance(newSubstance);
      if (!validation.isValid) {
        const substanceError = SubstanceErrorHandler.classifyError({
          code: 'VALIDATION_ERROR',
          validationErrors: validation.errors
        });
        
        SubstanceErrorHandler.logError(substanceError, 'addCustomSubstance - validation');
        
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors,
          substanceError
        };
      }

      // 2. Sanitize the data
      const sanitizedSubstance = sanitizeNewSubstance(newSubstance);

      // 3. Execute the main operation with retry logic
      const retryOptions = createSubstanceRetryOptions((attemptNumber, error) => {
        const substanceError = SubstanceErrorHandler.classifyError(error);
        SubstanceErrorHandler.logError(substanceError, `addCustomSubstance - retry attempt ${attemptNumber}`);
        
        if (onRetry) {
          onRetry(attemptNumber, substanceError);
        }
      });

      const result = await withRetry(async () => {
        return await this.performSubstanceInsertion(sanitizedSubstance);
      }, retryOptions);

      if (result.success && result.data) {
        // Update local cache if successful
        try {
          await this.refreshSubstanceCache();
        } catch (cacheError) {
          // Log cache error but don't fail the operation
          console.warn('Failed to refresh substance cache:', cacheError);
        }

        return {
          success: true,
          data: result.data
        };
      } else {
        const substanceError = SubstanceErrorHandler.classifyError(result.error);
        SubstanceErrorHandler.logError(substanceError, 'addCustomSubstance - final failure');
        
        const userMessage = SubstanceErrorHandler.getUserMessage(substanceError);
        
        return {
          success: false,
          error: userMessage.message,
          validationErrors: substanceError.validationErrors,
          substanceError
        };
      }

    } catch (error: any) {
      const substanceError = SubstanceErrorHandler.classifyError(error);
      SubstanceErrorHandler.logError(substanceError, 'addCustomSubstance - unexpected error');
      
      const userMessage = SubstanceErrorHandler.getUserMessage(substanceError);
      
      return {
        success: false,
        error: userMessage.message,
        substanceError
      };
    }
  }

  /**
   * Perform the actual substance insertion operation
   */
  private async performSubstanceInsertion(
    sanitizedSubstance: NewSubstance
  ): Promise<Database['public']['Tables']['substances']['Row'] & {
    substance_categories: { id: string; name: string };
  }> {
    // Check for duplicate names in existing substances
    const existingSubstances = await this.getExistingSubstanceNames();
    if (isDuplicateName(sanitizedSubstance.name, existingSubstances)) {
      const error = new Error('A substance with this name already exists');
      (error as any).code = '23505'; // Simulate unique constraint violation
      throw error;
    }

    // Map category enum to category ID
    const categoryId = await this.getCategoryId(sanitizedSubstance.category);
    if (!categoryId) {
      const error = new Error('Invalid category selected');
      (error as any).code = '23503'; // Simulate foreign key constraint violation
      throw error;
    }

    // Prepare data for Supabase insertion
    const substanceData: Database['public']['Tables']['substances']['Insert'] = {
      name: sanitizedSubstance.name,
      category_id: categoryId,
      default_unit: sanitizedSubstance.defaultUnit,
      description: sanitizedSubstance.description || null
    };

    // Insert into Supabase
    const result = await supabaseHelpers.addCustomSubstance(substanceData);
    
    if (!result) {
      throw new Error('Failed to insert substance into database');
    }

    return result;
  }

  /**
   * Get existing substance names for duplicate checking
   */
  private async getExistingSubstanceNames(): Promise<string[]> {
    try {
      const substances = await supabaseHelpers.getSubstances();
      return substances.map(substance => substance.name);
    } catch (error) {
      console.error('Error fetching existing substance names:', error);
      // Return empty array to allow operation to continue
      return [];
    }
  }

  /**
   * Get category ID from category enum
   */
  private async getCategoryId(category: SubstanceCategory): Promise<string | null> {
    try {
      const categories = await supabaseHelpers.getSubstanceCategories();
      const categoryRecord = categories.find(cat => cat.name.toLowerCase() === category.toLowerCase());
      return categoryRecord?.id || null;
    } catch (error) {
      console.error('Error fetching category ID:', error);
      return null;
    }
  }

  /**
   * Refresh local substance cache from Supabase
   */
  private async refreshSubstanceCache(): Promise<void> {
    try {
      // This would typically refresh the local cache
      // For now, we'll just log that cache should be refreshed
      console.log('Substance cache should be refreshed');
      
      // In a full implementation, you might:
      // 1. Fetch updated substances from Supabase
      // 2. Update the local substances Map
      // 3. Rebuild the search index
      // 4. Save to local storage
    } catch (error) {
      console.error('Error refreshing substance cache:', error);
    }
  }

  /**
   * Get all substances from Supabase (for UI components)
   */
  async getSupabaseSubstances(): Promise<{
    success: boolean;
    data?: Array<Database['public']['Tables']['substances']['Row'] & {
      substance_categories: { id: string; name: string };
    }>;
    error?: string;
  }> {
    try {
      const substances = await supabaseHelpers.getSubstances();
      return {
        success: true,
        data: substances
      };
    } catch (error: any) {
      console.error('Error fetching substances from Supabase:', error);
      
      if (error.message?.toLowerCase().includes('network') || 
          error.message?.toLowerCase().includes('fetch') ||
          error.name === 'NetworkError' ||
          error.code === 'NETWORK_ERROR') {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }

      return {
        success: false,
        error: 'Failed to load substances. Please try again.'
      };
    }
  }

  /**
   * Get substance categories from Supabase (for UI components)
   */
  async getSupabaseCategories(): Promise<{
    success: boolean;
    data?: Database['public']['Tables']['substance_categories']['Row'][];
    error?: string;
  }> {
    try {
      const categories = await supabaseHelpers.getSubstanceCategories();
      return {
        success: true,
        data: categories
      };
    } catch (error: any) {
      console.error('Error fetching categories from Supabase:', error);
      
      if (error.message?.toLowerCase().includes('network') || 
          error.message?.toLowerCase().includes('fetch') ||
          error.name === 'NetworkError' ||
          error.code === 'NETWORK_ERROR') {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }

      return {
        success: false,
        error: 'Failed to load categories. Please try again.'
      };
    }
  }

  /**
   * Get database statistics
   */
  getStatistics(): {
    totalSubstances: number;
    substancesByCategory: Record<SubstanceCategory, number>;
    verifiedSubstances: number;
    lastUpdated: Date | null;
  } {
    const stats = {
      totalSubstances: this.substances.size,
      substancesByCategory: {} as Record<SubstanceCategory, number>,
      verifiedSubstances: 0,
      lastUpdated: null as Date | null
    };

    // Initialize category counts
    for (const category of Object.values(SubstanceCategory)) {
      stats.substancesByCategory[category] = 0;
    }

    // Count substances
    for (const substance of this.substances.values()) {
      stats.substancesByCategory[substance.category]++;
      
      if (substance.verified) {
        stats.verifiedSubstances++;
      }

      if (!stats.lastUpdated || substance.lastUpdated > stats.lastUpdated) {
        stats.lastUpdated = substance.lastUpdated;
      }
    }

    return stats;
  }
  /**
   * Get recent substance intakes for a user (stub for AI personalization)
   */
  async getRecentIntakes(userId: string, limit: number = 10): Promise<Array<{
    substance_name: string;
    category: string;
    logged_at: Date;
  }>> {
    // Stub implementation - return mock data for now
    return [
      {
        substance_name: 'Protein Powder',
        category: 'supplements',
        logged_at: new Date('2024-01-01T10:00:00Z')
      },
      {
        substance_name: 'Creatine',
        category: 'supplements',
        logged_at: new Date('2024-01-01T11:00:00Z')
      }
    ];
  }
}

export const substanceDatabase = SubstanceDatabaseService.getInstance();