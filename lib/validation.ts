import { DraftState, Role } from "./types";

/**
 * Input validation schemas and utilities
 */

export class Validator {
  static validateDraftState(draftState: unknown): draftState is DraftState {
    if (!draftState || typeof draftState !== "object") return false;

    const draft = draftState as Record<string, unknown>;

    return (
      Array.isArray(draft.yourTeam) &&
      Array.isArray(draft.enemyTeam) &&
      draft.yourTeam.length === 5 &&
      draft.enemyTeam.length === 5 &&
      typeof draft.currentPhase === "string" &&
      ["pick", "completed"].includes(draft.currentPhase as string) &&
      typeof draft.currentPick === "number" &&
      draft.currentPick >= 0 &&
      draft.currentPick <= 10
    );
  }

  static validateRoleFilter(roles: unknown): roles is Role[] {
    if (!Array.isArray(roles)) return false;

    const validRoles: Role[] = [
      "Carry",
      "Support",
      "Initiator",
      "Disabler",
      "Jungler",
      "Durable",
      "Escape",
      "Pusher",
      "Nuker",
    ];

    return roles.every(
      (role) => typeof role === "string" && validRoles.includes(role as Role)
    );
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'&]/g, "") // Remove potential XSS characters
      .trim()
      .slice(0, 100); // Limit length
  }

  static validateHeroId(id: unknown): id is number {
    return typeof id === "number" && Number.isInteger(id) && id > 0 && id < 200; // Reasonable upper limit for Dota 2 heroes
  }

  static validateRequestBody(body: unknown): {
    isValid: boolean;
    errors: string[];
    data?: { draftState: DraftState; roleFilter?: Role[] };
  } {
    const errors: string[] = [];

    if (!body || typeof body !== "object") {
      return { isValid: false, errors: ["Invalid request body"] };
    }

    const { draftState, roleFilter } = body as Record<string, unknown>;

    if (!this.validateDraftState(draftState)) {
      errors.push("Invalid draft state");
    }

    if (roleFilter !== undefined && !this.validateRoleFilter(roleFilter)) {
      errors.push("Invalid role filter");
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      data: {
        draftState: draftState as DraftState,
        roleFilter: roleFilter as Role[] | undefined,
      },
    };
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    requests = requests.filter((timestamp) => timestamp > windowStart);

    if (requests.length >= this.maxRequests) {
      return false;
    }

    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const filteredRequests = requests.filter(
        (timestamp) => timestamp > windowStart
      );

      if (filteredRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filteredRequests);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();
