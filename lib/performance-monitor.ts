/**
 * Performance monitoring system for the Dota 2 Draft Analyzer
 * Tracks API performance, component render times, user interactions, and system health
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  category: "api" | "component" | "user-interaction" | "system";
  tags: string[];
}

interface APIMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  error?: string;
  retryCount?: number;
  cacheHit?: boolean;
}

interface ComponentMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: Record<string, unknown>;
  updateReason?: string;
}

interface UserInteractionMetric {
  action: string;
  element: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface SystemHealthMetric {
  memoryUsage: number;
  cpuUsage?: number;
  cacheHitRate: number;
  activeConnections: number;
  timestamp: number;
}

interface PerformanceReport {
  summary: {
    totalMetrics: number;
    timeRange: { start: number; end: number };
    averageApiResponseTime: number;
    apiErrorRate: number;
    slowestOperations: Array<{ name: string; duration: number }>;
    fastestOperations: Array<{ name: string; duration: number }>;
  };
  api: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    endpointStats: Record<
      string,
      {
        count: number;
        avgDuration: number;
        errorRate: number;
        p95Duration: number;
      }
    >;
  };
  components: {
    totalRenders: number;
    averageRenderTime: number;
    slowestComponents: Array<{ name: string; avgRenderTime: number }>;
  };
  userInteractions: {
    totalInteractions: number;
    topActions: Array<{ action: string; count: number }>;
  };
  system: {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCacheHitRate: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private componentMetrics: ComponentMetric[] = [];
  private userInteractionMetrics: UserInteractionMetric[] = [];
  private systemHealthMetrics: SystemHealthMetric[] = [];

  private readonly maxMetrics = 5000;
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Performance observers
  private performanceObserver: PerformanceObserver | null = null;

  private constructor() {
    this.startCleanupInterval();
    this.initializePerformanceObservers();

    // Cleanup on exit
    process.on("beforeExit", () => this.cleanup());
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start a performance timer
   */
  startTimer(
    name: string,
    category: PerformanceMetric["category"] = "system",
    tags: string[] = []
  ): (metadata?: Record<string, unknown>) => void {
    const start = performance.now();
    const startTime = Date.now();

    return (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - start;

      this.recordMetric({
        name,
        duration,
        timestamp: startTime,
        metadata,
        category,
        tags,
      });
    };
  }

  /**
   * Record an API call metric
   */
  recordAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: string,
    retryCount?: number,
    cacheHit?: boolean
  ): void {
    const metric: APIMetric = {
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
      error,
      retryCount,
      cacheHit,
    };

    this.apiMetrics.push(metric);
    this.enforceMetricsLimit(this.apiMetrics);

    // Also record as general metric
    this.recordMetric({
      name: `api_${method.toLowerCase()}_${endpoint}`,
      duration,
      timestamp: metric.timestamp,
      metadata: {
        endpoint,
        method,
        statusCode,
        error,
        retryCount,
        cacheHit,
      },
      category: "api",
      tags: [
        "api",
        method.toLowerCase(),
        statusCode >= 400 ? "error" : "success",
      ],
    });
  }

  /**
   * Record component render metric
   */
  recordComponentRender(
    componentName: string,
    renderTime: number,
    props?: Record<string, unknown>,
    updateReason?: string
  ): void {
    const metric: ComponentMetric = {
      componentName,
      renderTime,
      timestamp: Date.now(),
      props,
      updateReason,
    };

    this.componentMetrics.push(metric);
    this.enforceMetricsLimit(this.componentMetrics);

    this.recordMetric({
      name: `component_render_${componentName}`,
      duration: renderTime,
      timestamp: metric.timestamp,
      metadata: { props, updateReason },
      category: "component",
      tags: ["component", "render"],
    });
  }

  /**
   * Record user interaction
   */
  recordUserInteraction(
    action: string,
    element: string,
    metadata?: Record<string, unknown>
  ): void {
    const metric: UserInteractionMetric = {
      action,
      element,
      timestamp: Date.now(),
      metadata,
    };

    this.userInteractionMetrics.push(metric);
    this.enforceMetricsLimit(this.userInteractionMetrics);

    this.recordMetric({
      name: `user_${action}`,
      duration: 0, // Interactions don't have duration
      timestamp: metric.timestamp,
      metadata: { element, ...metadata },
      category: "user-interaction",
      tags: ["user-interaction", action],
    });
  }

  /**
   * Record system health metrics
   */
  recordSystemHealth(
    memoryUsage: number,
    cpuUsage: number | undefined,
    cacheHitRate: number,
    activeConnections: number
  ): void {
    const metric: SystemHealthMetric = {
      memoryUsage,
      cpuUsage,
      cacheHitRate,
      activeConnections,
      timestamp: Date.now(),
    };

    this.systemHealthMetrics.push(metric);
    this.enforceMetricsLimit(this.systemHealthMetrics);
  }

  /**
   * Get all metrics with optional filtering
   */
  getMetrics(filters?: {
    category?: PerformanceMetric["category"];
    tag?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];

    if (filters?.category) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.category === filters.category
      );
    }

    if (filters?.tag) {
      filteredMetrics = filteredMetrics.filter((m) =>
        m.tags.includes(filters.tag!)
      );
    }

    if (filters?.timeRange) {
      filteredMetrics = filteredMetrics.filter(
        (m) =>
          m.timestamp >= filters.timeRange!.start &&
          m.timestamp <= filters.timeRange!.end
      );
    }

    if (filters?.limit) {
      filteredMetrics = filteredMetrics.slice(-filters.limit);
    }

    return filteredMetrics;
  }

  /**
   * Get API metrics with optional filtering
   */
  getAPIMetrics(endpoint?: string, method?: string): APIMetric[] {
    let metrics = [...this.apiMetrics];

    if (endpoint) {
      metrics = metrics.filter((m) => m.endpoint === endpoint);
    }

    if (method) {
      metrics = metrics.filter((m) => m.method === method);
    }

    return metrics;
  }

  /**
   * Calculate average response time for API calls
   */
  getAverageResponseTime(endpoint?: string): number {
    const metrics = this.getAPIMetrics(endpoint);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Calculate error rate for API calls
   */
  getErrorRate(endpoint?: string): number {
    const metrics = this.getAPIMetrics(endpoint);
    if (metrics.length === 0) return 0;

    const errors = metrics.filter((m) => m.statusCode >= 400 || m.error);
    return (errors.length / metrics.length) * 100;
  }

  /**
   * Get P95 response time
   */
  getP95ResponseTime(endpoint?: string): number {
    const metrics = this.getAPIMetrics(endpoint);
    if (metrics.length === 0) return 0;

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    return durations[p95Index] || 0;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(timeRangeMs?: number): PerformanceReport {
    const now = Date.now();
    const timeRange = timeRangeMs
      ? { start: now - timeRangeMs, end: now }
      : { start: Math.min(...this.metrics.map((m) => m.timestamp)), end: now };

    const filteredMetrics = this.getMetrics({ timeRange });
    const filteredAPIMetrics = this.apiMetrics.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );

    // Calculate API endpoint statistics
    const endpointStats: Record<
      string,
      {
        count: number;
        totalDuration?: number;
        errors?: number;
        durations?: number[];
        avgDuration?: number;
        errorRate?: number;
        p95Duration?: number;
      }
    > = {};
    filteredAPIMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
          durations: [],
        };
      }

      const stats = endpointStats[key];
      if (stats) {
        stats.count++;
        stats.totalDuration = (stats.totalDuration || 0) + metric.duration;
        if (stats.durations) {
          stats.durations.push(metric.duration);
        }

        if (metric.statusCode >= 400 || metric.error) {
          stats.errors = (stats.errors || 0) + 1;
        }
      }
    });

    // Process endpoint stats
    Object.keys(endpointStats).forEach((key) => {
      const stats = endpointStats[key];
      if (
        stats &&
        stats.totalDuration !== undefined &&
        stats.errors !== undefined &&
        stats.durations
      ) {
        stats.avgDuration = stats.totalDuration / stats.count;
        stats.errorRate = (stats.errors / stats.count) * 100;

        // Calculate P95
        stats.durations.sort((a: number, b: number) => a - b);
        const p95Index = Math.floor(stats.durations.length * 0.95);
        stats.p95Duration = stats.durations[p95Index] || 0;

        // Cleanup temporary fields
        delete stats.totalDuration;
        delete stats.errors;
        delete stats.durations;
      }
    });

    // Generate report
    const report: PerformanceReport = {
      summary: {
        totalMetrics: filteredMetrics.length,
        timeRange,
        averageApiResponseTime: this.getAverageResponseTime(),
        apiErrorRate: this.getErrorRate(),
        slowestOperations: this.getSlowestOperations(10),
        fastestOperations: this.getFastestOperations(10),
      },
      api: {
        totalRequests: filteredAPIMetrics.length,
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        endpointStats: Object.fromEntries(
          Object.entries(endpointStats).map(([key, stats]) => [
            key,
            {
              count: stats.count,
              avgDuration: stats.avgDuration || 0,
              errorRate: stats.errorRate || 0,
              p95Duration: stats.p95Duration || 0,
            },
          ])
        ),
      },
      components: {
        totalRenders: this.componentMetrics.length,
        averageRenderTime: this.getAverageComponentRenderTime(),
        slowestComponents: this.getSlowestComponents(10),
      },
      userInteractions: {
        totalInteractions: this.userInteractionMetrics.length,
        topActions: this.getTopUserActions(10),
      },
      system: {
        averageMemoryUsage: this.getAverageMemoryUsage(),
        peakMemoryUsage: this.getPeakMemoryUsage(),
        averageCacheHitRate: this.getAverageCacheHitRate(),
      },
    };

    return report;
  }

  // Private methods

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.enforceMetricsLimit(this.metrics);
  }

  private enforceMetricsLimit<T extends { timestamp: number }>(
    metricsArray: T[]
  ): void {
    if (metricsArray.length > this.maxMetrics) {
      metricsArray.splice(0, metricsArray.length - this.maxMetrics);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Cleanup every minute
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.maxAge;

    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
    this.apiMetrics = this.apiMetrics.filter((m) => m.timestamp > cutoff);
    this.componentMetrics = this.componentMetrics.filter(
      (m) => m.timestamp > cutoff
    );
    this.userInteractionMetrics = this.userInteractionMetrics.filter(
      (m) => m.timestamp > cutoff
    );
    this.systemHealthMetrics = this.systemHealthMetrics.filter(
      (m) => m.timestamp > cutoff
    );
  }

  private initializePerformanceObservers(): void {
    if (typeof window === "undefined") return; // Server-side

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: `browser_${entry.entryType}_${entry.name}`,
            duration: entry.duration,
            timestamp: Date.now(),
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime,
            },
            category: "system",
            tags: ["browser", entry.entryType],
          });
        });
      });

      this.performanceObserver.observe({
        entryTypes: ["navigation", "resource", "measure", "mark"],
      });
    } catch (error) {
      console.warn("Performance Observer not supported:", error);
    }
  }

  private getSlowestOperations(
    limit: number
  ): Array<{ name: string; duration: number }> {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map((m) => ({ name: m.name, duration: m.duration }));
  }

  private getFastestOperations(
    limit: number
  ): Array<{ name: string; duration: number }> {
    return this.metrics
      .filter((m) => m.duration > 0)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, limit)
      .map((m) => ({ name: m.name, duration: m.duration }));
  }

  private getAverageComponentRenderTime(): number {
    if (this.componentMetrics.length === 0) return 0;
    const total = this.componentMetrics.reduce(
      (sum, m) => sum + m.renderTime,
      0
    );
    return total / this.componentMetrics.length;
  }

  private getSlowestComponents(
    limit: number
  ): Array<{ name: string; avgRenderTime: number }> {
    const componentStats: Record<string, { total: number; count: number }> = {};

    this.componentMetrics.forEach((metric) => {
      if (!componentStats[metric.componentName]) {
        componentStats[metric.componentName] = { total: 0, count: 0 };
      }
      componentStats[metric.componentName].total += metric.renderTime;
      componentStats[metric.componentName].count++;
    });

    return Object.entries(componentStats)
      .map(([name, stats]) => ({
        name,
        avgRenderTime: stats.total / stats.count,
      }))
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime)
      .slice(0, limit);
  }

  private getTopUserActions(
    limit: number
  ): Array<{ action: string; count: number }> {
    const actionCounts: Record<string, number> = {};

    this.userInteractionMetrics.forEach((metric) => {
      actionCounts[metric.action] = (actionCounts[metric.action] || 0) + 1;
    });

    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getAverageMemoryUsage(): number {
    if (this.systemHealthMetrics.length === 0) return 0;
    const total = this.systemHealthMetrics.reduce(
      (sum, m) => sum + m.memoryUsage,
      0
    );
    return total / this.systemHealthMetrics.length;
  }

  private getPeakMemoryUsage(): number {
    if (this.systemHealthMetrics.length === 0) return 0;
    return Math.max(...this.systemHealthMetrics.map((m) => m.memoryUsage));
  }

  private getAverageCacheHitRate(): number {
    if (this.systemHealthMetrics.length === 0) return 0;
    const total = this.systemHealthMetrics.reduce(
      (sum, m) => sum + m.cacheHitRate,
      0
    );
    return total / this.systemHealthMetrics.length;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    console.log("🗑️ Performance monitor cleaned up");
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  return {
    recordRender: (
      renderTime: number,
      props?: Record<string, unknown>,
      reason?: string
    ) => {
      monitor.recordComponentRender(componentName, renderTime, props, reason);
    },
    recordInteraction: (
      action: string,
      element: string,
      metadata?: Record<string, unknown>
    ) => {
      monitor.recordUserInteraction(action, element, metadata);
    },
    startTimer: (operation: string) => {
      return monitor.startTimer(`${componentName}_${operation}`, "component");
    },
  };
}
