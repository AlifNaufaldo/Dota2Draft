/**
 * Custom error classes for the Dota 2 Draft Analyzer application
 * Provides structured error handling with proper context and categorization
 */

export class DraftAnalyzerError extends Error {
  public readonly timestamp: Date;
  public readonly stack?: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DraftAnalyzerError";
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DraftAnalyzerError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class OpenDotaAPIError extends DraftAnalyzerError {
  constructor(
    message: string,
    statusCode: number,
    endpoint?: string,
    responseData?: unknown
  ) {
    super(message, "OPENDOTA_API_ERROR", statusCode, {
      endpoint,
      responseData,
    });
    this.name = "OpenDotaAPIError";
  }

  static fromResponse(
    response: Response,
    endpoint: string,
    data?: unknown
  ): OpenDotaAPIError {
    const message = `OpenDota API error: ${response.status} ${response.statusText}`;
    return new OpenDotaAPIError(message, response.status, endpoint, data);
  }

  static timeout(endpoint: string, timeoutMs: number): OpenDotaAPIError {
    return new OpenDotaAPIError(
      `Request timeout after ${timeoutMs}ms`,
      408,
      endpoint
    );
  }

  static networkError(
    endpoint: string,
    originalError: Error
  ): OpenDotaAPIError {
    return new OpenDotaAPIError(
      `Network error: ${originalError.message}`,
      0,
      endpoint,
      { originalError: originalError.message }
    );
  }
}

export class ValidationError extends DraftAnalyzerError {
  constructor(
    message: string,
    field?: string,
    value?: unknown,
    expectedType?: string
  ) {
    super(message, "VALIDATION_ERROR", 400, { field, value, expectedType });
    this.name = "ValidationError";
  }

  static required(field: string): ValidationError {
    return new ValidationError(`${field} is required`, field);
  }

  static invalidType(
    field: string,
    value: unknown,
    expectedType: string
  ): ValidationError {
    return new ValidationError(
      `${field} must be of type ${expectedType}`,
      field,
      value,
      expectedType
    );
  }

  static invalidRange(
    field: string,
    value: unknown,
    min?: number,
    max?: number
  ): ValidationError {
    const rangeDesc =
      min !== undefined && max !== undefined
        ? `between ${min} and ${max}`
        : min !== undefined
        ? `at least ${min}`
        : `at most ${max}`;

    return new ValidationError(`${field} must be ${rangeDesc}`, field, value);
  }
}

export class CacheError extends DraftAnalyzerError {
  constructor(
    message: string,
    operation?: "GET" | "SET" | "DELETE" | "CLEAR",
    key?: string
  ) {
    super(message, "CACHE_ERROR", 500, { operation, key });
    this.name = "CacheError";
  }

  static operationFailed(
    operation: string,
    key: string,
    originalError?: Error
  ): CacheError {
    const message = originalError
      ? `Cache ${operation.toLowerCase()} operation failed for key: ${key}. Reason: ${
          originalError.message
        }`
      : `Cache ${operation.toLowerCase()} operation failed for key: ${key}`;

    return new CacheError(
      message,
      operation as "GET" | "SET" | "DELETE" | "CLEAR",
      key
    );
  }
}

export class DraftLogicError extends DraftAnalyzerError {
  constructor(message: string, draftState?: unknown, heroId?: number) {
    super(message, "DRAFT_LOGIC_ERROR", 400, { draftState, heroId });
    this.name = "DraftLogicError";
  }

  static invalidHero(heroId: number): DraftLogicError {
    return new DraftLogicError(`Invalid hero ID: ${heroId}`, undefined, heroId);
  }

  static heroAlreadyPicked(heroId: number): DraftLogicError {
    return new DraftLogicError(
      `Hero ${heroId} is already picked`,
      undefined,
      heroId
    );
  }

  static teamFull(team: "your" | "enemy"): DraftLogicError {
    return new DraftLogicError(
      `${team === "your" ? "Your" : "Enemy"} team is already full (5/5 heroes)`
    );
  }
}

export class RateLimitError extends DraftAnalyzerError {
  constructor(message: string, retryAfter?: number, endpoint?: string) {
    super(message, "RATE_LIMIT_ERROR", 429, { retryAfter, endpoint });
    this.name = "RateLimitError";
  }

  static exceeded(endpoint: string, retryAfter: number): RateLimitError {
    return new RateLimitError(
      `Rate limit exceeded for ${endpoint}. Retry after ${retryAfter}ms`,
      retryAfter,
      endpoint
    );
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Determines if an error is a known application error
   */
  static isAppError(error: unknown): error is DraftAnalyzerError {
    return error instanceof DraftAnalyzerError;
  }

  /**
   * Safely extracts error message from unknown error
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "An unknown error occurred";
  }

  /**
   * Gets appropriate HTTP status code from error
   */
  static getStatusCode(error: unknown): number {
    if (ErrorHandler.isAppError(error)) {
      return error.statusCode;
    }
    return 500;
  }

  /**
   * Creates standardized error response for API routes
   */
  static createErrorResponse(error: unknown, includeStack = false) {
    const message = ErrorHandler.getErrorMessage(error);
    const statusCode = ErrorHandler.getStatusCode(error);

    const response: Record<string, unknown> = {
      error: true,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    if (ErrorHandler.isAppError(error)) {
      response.code = error.code;
      response.context = error.context;
    }

    if (includeStack && error instanceof Error) {
      response.stack = error.stack;
    }

    return response;
  }

  /**
   * Logs error with appropriate level and context
   */
  static logError(error: unknown, context?: Record<string, unknown>): void {
    const message = ErrorHandler.getErrorMessage(error);
    const statusCode = ErrorHandler.getStatusCode(error);

    const logData = {
      message,
      statusCode,
      context,
      timestamp: new Date().toISOString(),
    };

    if (ErrorHandler.isAppError(error)) {
      logData.context = { ...logData.context, ...error.context };
    }

    // Use appropriate log level based on status code
    if (statusCode >= 500) {
      console.error("🔴 Server Error:", logData);
    } else if (statusCode >= 400) {
      console.warn("🟡 Client Error:", logData);
    } else {
      console.info("ℹ️ Info:", logData);
    }

    // Include stack trace for server errors in development
    if (
      statusCode >= 500 &&
      process.env.NODE_ENV === "development" &&
      error instanceof Error
    ) {
      console.error("Stack trace:", error.stack);
    }
  }
}

/**
 * Type guards for error checking
 */
export const isOpenDotaAPIError = (error: unknown): error is OpenDotaAPIError =>
  error instanceof OpenDotaAPIError;

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const isCacheError = (error: unknown): error is CacheError =>
  error instanceof CacheError;

export const isDraftLogicError = (error: unknown): error is DraftLogicError =>
  error instanceof DraftLogicError;

export const isRateLimitError = (error: unknown): error is RateLimitError =>
  error instanceof RateLimitError;
