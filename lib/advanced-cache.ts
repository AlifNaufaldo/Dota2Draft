/**
 * Advanced caching system for the Dota 2 Draft Analyzer
 * Features: LRU eviction, cache tagging, statistics, TTL, and persistence
 */

import { CacheError } from "./errors";
import { config } from "./config";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags: string[];
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
  avgHits: number;
  oldestEntry: number;
  newestEntry: number;
}

interface CacheOptions {
  maxSize?: number;
  maxMemoryMB?: number;
  defaultTTL?: number;
  cleanupIntervalMs?: number;
  persistToDisk?: boolean;
}

export class AdvancedCache {
  private static instance: AdvancedCache;
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  private readonly maxSize: number;
  private readonly maxMemoryBytes: number;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentMemoryUsage = 0;

  private constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.maxMemoryBytes = (options.maxMemoryMB || 100) * 1024 * 1024; // Convert MB to bytes
    this.defaultTTL = options.defaultTTL || config.CACHE_TTL_HEROES;

    // Start cleanup interval
    if (options.cleanupIntervalMs !== 0) {
      this.startCleanupInterval(options.cleanupIntervalMs || 300000); // 5 minutes default
    }

    // Graceful shutdown
    process.on("beforeExit", () => this.destroy());
    process.on("SIGINT", () => this.destroy());
    process.on("SIGTERM", () => this.destroy());
  }

  static getInstance(options?: CacheOptions): AdvancedCache {
    if (!AdvancedCache.instance) {
      AdvancedCache.instance = new AdvancedCache(options);
    }
    return AdvancedCache.instance;
  }

  /**
   * Set a value in cache with optional TTL and tags
   */
  set<T>(
    key: string,
    data: T,
    ttl: number = this.defaultTTL,
    tags: string[] = []
  ): void {
    try {
      // Calculate approximate size
      const size = this.calculateSize(data);

      // Check memory limits before adding
      if (this.currentMemoryUsage + size > this.maxMemoryBytes) {
        this.evictByMemory(size);
      }

      // Check size limits before adding
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      // Remove existing entry if it exists
      const existingEntry = this.cache.get(key);
      if (existingEntry) {
        this.currentMemoryUsage -= existingEntry.size;
      }

      // Create new cache entry
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        tags: [...tags],
        lastAccessed: Date.now(),
        size,
      };

      this.cache.set(key, entry);
      this.currentMemoryUsage += size;
      this.stats.sets++;
    } catch (error) {
      throw CacheError.operationFailed("SET", key, error as Error);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (this.isExpired(entry)) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access statistics
      entry.hits++;
      entry.lastAccessed = Date.now();
      this.stats.hits++;

      return entry.data;
    } catch (error) {
      throw CacheError.operationFailed("GET", key, error as Error);
    }
  }

  /**
   * Check if a key exists in cache (without affecting stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentMemoryUsage -= entry.size;
        this.stats.deletes++;
      }

      const deleted = this.cache.delete(key);
      return deleted;
    } catch (error) {
      throw CacheError.operationFailed("DELETE", key, error as Error);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      this.cache.clear();
      this.currentMemoryUsage = 0;
      this.resetStats();
    } catch (error) {
      throw CacheError.operationFailed("CLEAR", "all", error as Error);
    }
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate cache entries by pattern (supports wildcards)
   */
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const total = this.stats.hits + this.stats.misses;

    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      avgHits:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + e.hits, 0) / entries.length
          : 0,
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
    };
  }

  /**
   * Get detailed information about cache entries
   */
  getEntryInfo(key: string): {
    exists: boolean;
    expired: boolean;
    hits: number;
    age: number;
    size: number;
    tags: string[];
    ttl: number;
    remainingTTL: number;
  } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const remainingTTL = Math.max(0, entry.ttl - age);

    return {
      exists: true,
      expired: this.isExpired(entry),
      hits: entry.hits,
      age,
      size: entry.size,
      tags: [...entry.tags],
      ttl: entry.ttl,
      remainingTTL,
    };
  }

  /**
   * Get keys matching a pattern
   */
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());

    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return keys.filter((key) => regex.test(key));
  }

  /**
   * Get entries by tag
   */
  getByTag(
    tag: string
  ): Array<{ key: string; data: unknown; entry: CacheEntry<unknown> }> {
    const results: Array<{
      key: string;
      data: unknown;
      entry: CacheEntry<unknown>;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        results.push({ key, data: entry.data, entry });
      }
    }

    return results;
  }

  /**
   * Extend TTL for a key
   */
  extendTTL(key: string, additionalMs: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.ttl += additionalMs;
    return true;
  }

  /**
   * Touch a key (reset its TTL)
   */
  touch(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.timestamp = Date.now();
    entry.lastAccessed = Date.now();
    return true;
  }

  // Private methods

  private startCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  private cleanup(): void {
    const beforeSize = this.cache.size;
    const beforeMemory = this.currentMemoryUsage;
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.currentMemoryUsage -= entry.size;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `🧹 Cache cleanup: removed ${cleaned} expired entries (${beforeSize} → ${
          this.cache.size
        } entries, ${Math.round(beforeMemory / 1024)}KB → ${Math.round(
          this.currentMemoryUsage / 1024
        )}KB)`
      );
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey = "";
    let oldestTime = Date.now();
    let lowestHits = Infinity;

    // Find least recently used entry with lowest hit count
    for (const [key, entry] of this.cache.entries()) {
      const score = entry.hits + entry.lastAccessed / 1000000; // Bias towards recent access

      if (
        score < lowestHits ||
        (score === lowestHits && entry.lastAccessed < oldestTime)
      ) {
        oldestKey = key;
        oldestTime = entry.lastAccessed;
        lowestHits = score;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      console.log(`🗑️ Cache eviction (LRU): removed ${oldestKey}`);
    }
  }

  private evictByMemory(requiredSize: number): void {
    const targetMemory = this.maxMemoryBytes * 0.8; // Target 80% of max memory

    // Sort entries by utility score (hits per byte per age)
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        utility:
          entry.hits / (entry.size * (Date.now() - entry.lastAccessed + 1)),
      }))
      .sort((a, b) => a.utility - b.utility);

    // Evict lowest utility entries until we have enough space
    for (const { key } of entries) {
      if (this.currentMemoryUsage + requiredSize <= targetMemory) {
        break;
      }
      this.delete(key);
    }

    console.log(
      `🗑️ Cache eviction (memory): freed space for ${Math.round(
        requiredSize / 1024
      )}KB`
    );
  }

  private calculateSize(data: unknown): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(data);
    return str.length * 2; // Rough estimate for UTF-16 encoding
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Destroy the cache instance and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    console.log("🗑️ Cache destroyed and cleaned up");
  }
}

// Export singleton instance creator
export const createCache = (options?: CacheOptions) =>
  AdvancedCache.getInstance(options);

// Export default instance
export const cache = AdvancedCache.getInstance();
