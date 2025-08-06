/**
 * Substance Performance Monitor - Advanced Performance Tracking and Optimization
 * Monitors substance operations, identifies bottlenecks, and provides optimization insights
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  operationCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  lastUpdated: Date;
}

interface OptimizationSuggestion {
  type: 'cache' | 'network' | 'ui' | 'database';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  implementation: string;
}

class SubstancePerformanceMonitor {
  private static instance: SubstancePerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, PerformanceMetric> = new Map();
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics
  
  public static getInstance(): SubstancePerformanceMonitor {
    if (!SubstancePerformanceMonitor.instance) {
      SubstancePerformanceMonitor.instance = new SubstancePerformanceMonitor();
    }
    return SubstancePerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance metric
   */
  startOperation(operationId: string, operationType: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation: operationType,
      startTime: performance.now(),
      success: false,
      metadata,
    };
    
    this.activeOperations.set(operationId, metric);
  }

  /**
   * End tracking a performance metric with success
   */
  endOperation(operationId: string, success: boolean = true, error?: string): void {
    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found for operation: ${operationId}`);
      return;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    
    // Move to completed metrics
    this.metrics.push(metric);
    this.activeOperations.delete(operationId);
    
    // Maintain metrics limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    // Log slow operations
    if (metric.duration > 2000) { // 2 seconds
      console.warn(`Slow substance operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Track substance loading performance
   */
  async trackSubstanceLoad<T>(
    operationType: string,
    loadFunction: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.startOperation(operationId, operationType, metadata);
    
    try {
      const result = await loadFunction();
      this.endOperation(operationId, true);
      return result;
    } catch (error: any) {
      this.endOperation(operationId, false, error.message);
      throw error;
    }
  }

  /**
   * Track substance creation performance
   */
  async trackSubstanceCreation<T>(
    createFunction: () => Promise<T>,
    substanceName: string
  ): Promise<T> {
    return this.trackSubstanceLoad(
      'substance_creation',
      createFunction,
      { substanceName, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Track search performance
   */
  async trackSearch<T>(
    searchFunction: () => Promise<T>,
    query: string,
    resultCount?: number
  ): Promise<T> {
    return this.trackSubstanceLoad(
      'substance_search',
      searchFunction,
      { query, queryLength: query.length, resultCount }
    );
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationCounts: {},
        errorCounts: {},
        lastUpdated: new Date(),
      };
    }
    
    const durations = completedMetrics.map(m => m.duration!);
    const successfulOps = completedMetrics.filter(m => m.success);
    const failedOps = completedMetrics.filter(m => !m.success);
    
    const operationCounts: Record<string, number> = {};
    const errorCounts: Record<string, number> = {};
    
    completedMetrics.forEach(metric => {
      operationCounts[metric.operation] = (operationCounts[metric.operation] || 0) + 1;
      
      if (!metric.success && metric.error) {
        errorCounts[metric.error] = (errorCounts[metric.error] || 0) + 1;
      }
    });
    
    return {
      totalOperations: completedMetrics.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      operationCounts,
      errorCounts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get optimization suggestions based on performance data
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const stats = this.getStats();
    const suggestions: OptimizationSuggestion[] = [];
    
    // Check for slow operations
    if (stats.averageDuration > 1500) {
      suggestions.push({
        type: 'cache',
        priority: 'high',
        description: 'Average operation time is high',
        impact: 'Reduce loading times by 60-80%',
        implementation: 'Implement aggressive caching for frequently accessed substances',
      });
    }
    
    // Check for high failure rate
    const failureRate = stats.failedOperations / stats.totalOperations;
    if (failureRate > 0.1) {
      suggestions.push({
        type: 'network',
        priority: 'critical',
        description: `High failure rate: ${(failureRate * 100).toFixed(1)}%`,
        impact: 'Improve user experience and data reliability',
        implementation: 'Add retry mechanisms and better error handling',
      });
    }
    
    // Check for frequent search operations
    const searchCount = stats.operationCounts['substance_search'] || 0;
    if (searchCount > stats.totalOperations * 0.4) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        description: 'High search frequency detected',
        impact: 'Reduce search latency by 50-70%',
        implementation: 'Implement search result caching and predictive loading',
      });
    }
    
    // Check for slow substance creation
    const creationMetrics = this.metrics.filter(m => m.operation === 'substance_creation');
    if (creationMetrics.length > 0) {
      const avgCreationTime = creationMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / creationMetrics.length;
      if (avgCreationTime > 2000) {
        suggestions.push({
          type: 'ui',
          priority: 'medium',
          description: 'Substance creation is slow',
          impact: 'Improve perceived performance during creation',
          implementation: 'Add optimistic updates and better loading states',
        });
      }
    }
    
    // Check for database bottlenecks
    if (stats.maxDuration > 5000) {
      suggestions.push({
        type: 'database',
        priority: 'high',
        description: 'Some operations are very slow',
        impact: 'Eliminate performance spikes',
        implementation: 'Optimize database queries and add connection pooling',
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(threshold: number = 2000): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration && m.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);
  }

  /**
   * Get operation breakdown by type
   */
  getOperationBreakdown(): Record<string, { count: number; avgDuration: number; successRate: number }> {
    const breakdown: Record<string, { count: number; totalDuration: number; successes: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!breakdown[metric.operation]) {
        breakdown[metric.operation] = { count: 0, totalDuration: 0, successes: 0 };
      }
      
      breakdown[metric.operation].count++;
      breakdown[metric.operation].totalDuration += metric.duration || 0;
      if (metric.success) {
        breakdown[metric.operation].successes++;
      }
    });
    
    const result: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    
    Object.entries(breakdown).forEach(([operation, data]) => {
      result[operation] = {
        count: data.count,
        avgDuration: data.totalDuration / data.count,
        successRate: data.successes / data.count,
      };
    });
    
    return result;
  }

  /**
   * Clear performance data (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * Export performance data for analysis
   */
  exportMetrics(): {
    metrics: PerformanceMetric[];
    stats: PerformanceStats;
    suggestions: OptimizationSuggestion[];
  } {
    return {
      metrics: [...this.metrics],
      stats: this.getStats(),
      suggestions: this.getOptimizationSuggestions(),
    };
  }
}

export const substancePerformanceMonitor = SubstancePerformanceMonitor.getInstance();
export type { PerformanceMetric, PerformanceStats, OptimizationSuggestion };