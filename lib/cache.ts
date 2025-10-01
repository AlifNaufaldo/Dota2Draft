/**
 * In-memory cache utility with TTL support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const globalCache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  heroes: () => "heroes",
  heroStats: () => "hero-stats",
  heroMatchups: (heroId: number) => `hero-matchups:${heroId}`,
  suggestions: (draftHash: string, roleFilter: string) =>
    `suggestions:${draftHash}:${roleFilter}`,

  // Generate hash for draft state
  generateDraftHash: (
    yourTeam: (number | null)[],
    enemyTeam: (number | null)[]
  ): string => {
    const teamIds = [...yourTeam, ...enemyTeam]
      .filter((id) => id !== null)
      .sort();
    return teamIds.join(",");
  },
} as const;
