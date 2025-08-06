import { analyticsService } from './analytics/analyticsService';

interface TimerData {
  startTime: number;
}

class SubstancePerformanceMonitor {
  private timers: Map<string, TimerData> = new Map();

  startTimer(label: string): void {
    console.time(label);
    this.timers.set(label, {
      startTime: performance.now(),
    });
  }

  endTimer(label: string): void {
    console.timeEnd(label);
    
    const timerData = this.timers.get(label);
    if (timerData) {
      const durationMs = performance.now() - timerData.startTime;
      
      analyticsService.trackEvent('perf_metric', {
        label,
        durationMs,
      });
      
      this.timers.delete(label);
    }
  }
}

export const substancePerformanceMonitor = new SubstancePerformanceMonitor();