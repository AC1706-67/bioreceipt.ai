/**
 * Photo Performance Monitor
 * Tracks and logs performance metrics for photo operations
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  renderTimes: PerformanceMetric[];
  loadTimes: PerformanceMetric[];
  cacheHitRates: PerformanceMetric[];
  memoryUsage: PerformanceMetric[];
  summary: {
    averageRenderTime: number;
    averageLoadTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    slowRenders: number;
    totalOperations: number;
  };
}

class PhotoPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderTimers: Map<string, number> = new Map();
  private loadTimers: Map<string, number> = new Map();
  private isEnabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  /**
   * Start measuring render time for a component
   */
  startRenderMeasurement(componentId: string): void {
    if (!this.isEnabled) return;
    
    this.renderTimers.set(componentId, performance.now());
  }

  /**
   * End render measurement and log the result
   */
  endRenderMeasurement(componentId: string, metadata?: Record<string, any>): number {
    if (!this.isEnabled) return 0;

    const startTime = this.renderTimers.get(componentId);
    if (!startTime) {
      console.warn(`No start time found for component: ${componentId}`);
      return 0;
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    this.addMetric({
      name: 'render_time',
      value: renderTime,
      timestamp: Date.now(),
      metadata: {
        componentId,
        ...metadata,
      },
    });

    this.renderTimers.delete(componentId);

    // Log slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected: ${componentId} took ${renderTime.toFixed(2)}ms`, metadata);
    }

    return renderTime;
  }

  /**
   * Start measuring image load time
   */
  startLoadMeasurement(imageUrl: string): void {
    if (!this.isEnabled) return;
    
    this.loadTimers.set(imageUrl, performance.now());
  }

  /**
   * End load measurement and log the result
   */
  endLoadMeasurement(imageUrl: string, success: boolean = true, metadata?: Record<string, any>): number {
    if (!this.isEnabled) return 0;

    const startTime = this.loadTimers.get(imageUrl);
    if (!startTime) {
      console.warn(`No start time found for image: ${imageUrl}`);
      return 0;
    }

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    this.addMetric({
      name: 'load_time',
      value: loadTime,
      timestamp: Date.now(),
      metadata: {
        imageUrl,
        success,
        ...metadata,
      },
    });

    this.loadTimers.delete(imageUrl);

    // Log slow loads
    if (loadTime > 3000) { // More than 3 seconds
      console.warn(`Slow image load: ${imageUrl} took ${loadTime.toFixed(2)}ms`, metadata);
    }

    return loadTime;
  }

  /**
   * Log cache hit rate
   */
  logCacheHitRate(hitRate: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.addMetric({
      name: 'cache_hit_rate',
      value: hitRate,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(memoryMB: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.addMetric({
      name: 'memory_usage',
      value: memoryMB,
      timestamp: Date.now(),
      metadata,
    });

    // Log high memory usage
    if (memoryMB > 100) { // More than 100MB
      console.warn(`High memory usage detected: ${memoryMB.toFixed(2)}MB`, metadata);
    }
  }

  /**
   * Add a custom metric
   */
  addMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const renderTimes = this.metrics.filter(m => m.name === 'render_time');
    const loadTimes = this.metrics.filter(m => m.name === 'load_time');
    const cacheHitRates = this.metrics.filter(m => m.name === 'cache_hit_rate');
    const memoryUsage = this.metrics.filter(m => m.name === 'memory_usage');

    const averageRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((sum, m) => sum + m.value, 0) / renderTimes.length
      : 0;

    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, m) => sum + m.value, 0) / loadTimes.length
      : 0;

    const latestCacheHitRate = cacheHitRates.length > 0
      ? cacheHitRates[cacheHitRates.length - 1].value
      : 0;

    const latestMemoryUsage = memoryUsage.length > 0
      ? memoryUsage[memoryUsage.length - 1].value
      : 0;

    const slowRenders = renderTimes.filter(m => m.value > 16).length;

    return {
      renderTimes,
      loadTimes,
      cacheHitRates,
      memoryUsage,
      summary: {
        averageRenderTime: Math.round(averageRenderTime * 100) / 100,
        averageLoadTime: Math.round(averageLoadTime * 100) / 100,
        cacheHitRate: Math.round(latestCacheHitRate * 100) / 100,
        memoryUsage: Math.round(latestMemoryUsage * 100) / 100,
        slowRenders,
        totalOperations: this.metrics.length,
      },
    };
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.renderTimers.clear();
    this.loadTimers.clear();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      report: this.getPerformanceReport(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.isEnabled) return;

    const report = this.getPerformanceReport();
    const { summary } = report;

    console.group('📊 Photo Performance Summary');
    console.log(`Average Render Time: ${summary.averageRenderTime}ms`);
    console.log(`Average Load Time: ${summary.averageLoadTime}ms`);
    console.log(`Cache Hit Rate: ${summary.cacheHitRate}%`);
    console.log(`Memory Usage: ${summary.memoryUsage}MB`);
    console.log(`Slow Renders: ${summary.slowRenders}`);
    console.log(`Total Operations: ${summary.totalOperations}`);
    console.groupEnd();

    // Performance recommendations
    if (summary.averageRenderTime > 16) {
      console.warn('⚠️ Average render time is above 16ms. Consider optimizing components.');
    }
    if (summary.averageLoadTime > 2000) {
      console.warn('⚠️ Average load time is above 2s. Consider image optimization.');
    }
    if (summary.cacheHitRate < 70) {
      console.warn('⚠️ Cache hit rate is below 70%. Consider adjusting cache strategy.');
    }
    if (summary.memoryUsage > 50) {
      console.warn('⚠️ Memory usage is above 50MB. Consider reducing cache size.');
    }
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearMetrics();
    }
  }

  /**
   * Check if monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const photoPerformanceMonitor = new PhotoPerformanceMonitor();

// Export class for testing
export { PhotoPerformanceMonitor };

export default photoPerformanceMonitor;