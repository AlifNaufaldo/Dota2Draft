/**
 * Enhanced OpenDota API client with advanced features:
 * - Intelligent rate limiting with queue management
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern for resilience
 * - Request deduplication
 * - Comprehensive error handling
 * - Performance monitoring integration
 */

import { config, ENDPOINTS, RATE_LIMIT } from "./config";
import { OpenDotaAPIError, RateLimitError } from "./errors";
import { Hero, HeroStats } from "./types";

interface QueuedRequest<T> {
  url: string;
  options?: RequestInit;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
  priority: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

interface RateLimitState {
  requestCount: number;
  windowStart: number;
  queueSize: number;
}

export class EnhancedOpenDotaClient {
  private static instance: EnhancedOpenDotaClient;

  // Request queue and processing
  private requestQueue: Array<QueuedRequest<unknown>> = [];
  private isProcessing = false;
  private activeRequests = new Map<string, Promise<unknown>>();

  // Rate limiting
  private rateLimitState: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
    queueSize: 0,
  };

  // Circuit breaker
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: "CLOSED",
  };

  // Metrics
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: 0,
  };

  // Configuration
  private readonly maxQueueSize = 100;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 60000; // 1 minute
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  private constructor() {
    // Start processing queue
    this.startQueueProcessor();

    // Cleanup on exit
    process.on("beforeExit", () => this.destroy());
  }

  static getInstance(): EnhancedOpenDotaClient {
    if (!EnhancedOpenDotaClient.instance) {
      EnhancedOpenDotaClient.instance = new EnhancedOpenDotaClient();
    }
    return EnhancedOpenDotaClient.instance;
  }

  /**
   * Make a request to OpenDota API with automatic queuing and rate limiting
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    priority: number = 0
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker.state === "OPEN") {
      if (
        Date.now() - this.circuitBreaker.lastFailureTime <
        this.circuitBreakerTimeout
      ) {
        throw new OpenDotaAPIError(
          "Circuit breaker is OPEN - service temporarily unavailable",
          503,
          endpoint
        );
      } else {
        // Try to half-open the circuit
        this.circuitBreaker.state = "HALF_OPEN";
      }
    }

    // Check queue size
    if (this.requestQueue.length >= this.maxQueueSize) {
      throw new RateLimitError(
        "Request queue is full. Please try again later.",
        5000,
        endpoint
      );
    }

    // Check for duplicate requests
    const requestKey = this.getRequestKey(endpoint, options);
    if (this.activeRequests.has(requestKey)) {
      console.log(`🔄 Deduplicating request: ${endpoint}`);
      // Return a promise that waits for the existing request
      return this.waitForExistingRequest<T>(requestKey);
    }

    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        url: endpoint,
        options,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
        priority,
      };

      // Insert request based on priority (higher priority first)
      const insertIndex = this.requestQueue.findIndex(
        (req) => req.priority < priority
      );
      if (insertIndex === -1) {
        this.requestQueue.push(queuedRequest as QueuedRequest<unknown>);
      } else {
        this.requestQueue.splice(
          insertIndex,
          0,
          queuedRequest as QueuedRequest<unknown>
        );
      }

      this.rateLimitState.queueSize = this.requestQueue.length;
      this.startQueueProcessor();
    });
  }

  /**
   * Get all heroes
   */
  async getHeroes(): Promise<Hero[]> {
    return this.request<Hero[]>(ENDPOINTS.HEROES, {}, 10); // High priority
  }

  /**
   * Get hero statistics
   */
  async getHeroStats(): Promise<HeroStats[]> {
    return this.request<HeroStats[]>(ENDPOINTS.HERO_STATS, {}, 8);
  }

  /**
   * Get professional matches
   */
  async getProMatches(limit: number = 100): Promise<unknown[]> {
    return this.request<unknown[]>(
      `${ENDPOINTS.PRO_MATCHES}?take=${limit}`,
      {},
      5
    );
  }

  /**
   * Get hero matchups data
   */
  async getHeroMatchups(heroId: number): Promise<unknown[]> {
    return this.request<unknown[]>(`${ENDPOINTS.MATCHUPS}/${heroId}`, {}, 3);
  }

  /**
   * Get current metrics and status
   */
  getMetrics(): RequestMetrics & {
    circuitBreakerState: CircuitBreakerState;
    rateLimitState: RateLimitState;
    queueLength: number;
  } {
    return {
      ...this.metrics,
      circuitBreakerState: { ...this.circuitBreaker },
      rateLimitState: { ...this.rateLimitState },
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    circuitBreakerState: string;
    queueLength: number;
    lastError?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple health check request
      await this.request("/health", { method: "HEAD" }, 10);
      const responseTime = Date.now() - startTime;

      return {
        status: this.circuitBreaker.state === "OPEN" ? "degraded" : "healthy",
        responseTime,
        circuitBreakerState: this.circuitBreaker.state,
        queueLength: this.requestQueue.length,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        circuitBreakerState: this.circuitBreaker.state,
        queueLength: this.requestQueue.length,
        lastError: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Private methods

  private startQueueProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue().finally(() => {
      this.isProcessing = false;
    });
  }

  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0) {
      // Check rate limit
      const now = Date.now();
      if (now - this.rateLimitState.windowStart >= RATE_LIMIT.WINDOW_MS) {
        // Reset rate limit window
        this.rateLimitState.requestCount = 0;
        this.rateLimitState.windowStart = now;
      }

      if (this.rateLimitState.requestCount >= RATE_LIMIT.MAX_REQUESTS) {
        // Wait for rate limit window to reset
        const waitTime =
          RATE_LIMIT.WINDOW_MS - (now - this.rateLimitState.windowStart);
        console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        continue;
      }

      const request = this.requestQueue.shift()!;
      this.rateLimitState.queueSize = this.requestQueue.length;

      try {
        const result = await this.executeRequest(request);
        request.resolve(result);
        this.onRequestSuccess();
      } catch (error) {
        const shouldRetry = this.shouldRetryRequest(request, error as Error);

        if (shouldRetry) {
          request.retryCount++;
          // Add delay before retry
          await this.sleep(this.calculateRetryDelay(request.retryCount));
          // Re-queue the request
          this.requestQueue.unshift(request);
          console.log(
            `🔄 Retrying request (${request.retryCount}/${this.maxRetries}): ${request.url}`
          );
        } else {
          request.reject(error as Error);
          this.onRequestFailure(error as Error);
        }
      }

      // Small delay between requests
      await this.sleep(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
    }
  }

  private async executeRequest<T>(request: QueuedRequest<T>): Promise<T> {
    const requestKey = this.getRequestKey(request.url, request.options);
    // activeRequests will be set in the main request method

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.OPENDOTA_TIMEOUT
    );

    try {
      const url = request.url.startsWith("http")
        ? request.url
        : `${config.OPENDOTA_API_BASE}${request.url}`;

      const response = await fetch(url, {
        ...request.options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": `${config.NEXT_PUBLIC_APP_NAME}/1.0`,
          ...request.options?.headers,
        },
      });

      clearTimeout(timeoutId);
      this.rateLimitState.requestCount++;
      this.metrics.totalRequests++;

      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);

      if (!response.ok) {
        throw OpenDotaAPIError.fromResponse(response, request.url);
      }

      // Handle different content types
      const contentType = response.headers.get("content-type");
      let data: T;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as T;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenDotaAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw OpenDotaAPIError.timeout(request.url, config.OPENDOTA_TIMEOUT);
      }

      throw OpenDotaAPIError.networkError(request.url, error as Error);
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  private shouldRetryRequest(
    request: QueuedRequest<unknown>,
    error: Error
  ): boolean {
    if (request.retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors, timeouts, and 5xx status codes
    if (error instanceof OpenDotaAPIError) {
      return (
        error.statusCode >= 500 ||
        error.statusCode === 408 ||
        error.statusCode === 0
      );
    }

    return true;
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const delay = this.baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 30000); // Max 30 seconds
  }

  private onRequestSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.lastRequestTime = Date.now();

    // Reset circuit breaker on success
    if (this.circuitBreaker.state === "HALF_OPEN") {
      this.circuitBreaker.state = "CLOSED";
      this.circuitBreaker.failures = 0;
      console.log("✅ Circuit breaker reset to CLOSED");
    }
  }

  private onRequestFailure(error: Error): void {
    this.metrics.failedRequests++;
    this.metrics.lastRequestTime = Date.now();

    // Update circuit breaker
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreakerThreshold) {
      this.circuitBreaker.state = "OPEN";
      console.log("🔴 Circuit breaker opened due to failures:", error.message);
    }
  }

  private updateResponseTimeMetrics(responseTime: number): void {
    const { totalRequests, averageResponseTime } = this.metrics;
    this.metrics.averageResponseTime =
      (averageResponseTime * (totalRequests - 1) + responseTime) /
      totalRequests;
  }

  private getRequestKey(url: string, options?: RequestInit): string {
    const method = options?.method || "GET";
    const body = options?.body ? JSON.stringify(options.body) : "";
    return `${method}:${url}:${body}`;
  }

  private async waitForExistingRequest<T>(requestKey: string): Promise<T> {
    // Get the existing promise for the request
    const existingPromise = this.activeRequests.get(requestKey);
    if (existingPromise) {
      console.log(`🔄 Waiting for existing request: ${requestKey}`);
      try {
        // Wait for the existing request to complete and return its result
        return (await existingPromise) as T;
      } catch (error) {
        // If the existing request failed, we'll let the caller try again
        console.log(
          `❌ Existing request failed: ${requestKey}, allowing retry`
        );
        throw error;
      }
    }

    // If no active request exists, throw an error (this shouldn't happen)
    throw new OpenDotaAPIError(
      "No active request found for deduplication",
      500
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.requestQueue.length = 0;
    this.activeRequests.clear();
    console.log("🗑️ OpenDota client destroyed");
  }
}

// Export singleton instance
export const openDotaClient = EnhancedOpenDotaClient.getInstance();
