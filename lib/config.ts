import { z } from "zod";

const envSchema = z.object({
  OPENDOTA_API_BASE: z.string().url().default("https://api.opendota.com/api"),
  OPENDOTA_RATE_LIMIT: z.coerce.number().min(1).max(300).default(60),
  OPENDOTA_TIMEOUT: z.coerce.number().min(1000).max(30000).default(10000),
  CACHE_TTL_HEROES: z.coerce.number().min(60000).default(3600000),
  CACHE_TTL_STATS: z.coerce.number().min(60000).default(1800000),
  CACHE_TTL_SUGGESTIONS: z.coerce.number().min(60000).default(300000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Dota 2 Draft Analyzer"),
});

// Validate environment variables at startup
let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment configuration:");
    error.issues.forEach((err: z.ZodIssue) => {
      console.error(`  ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { config };
export type Config = z.infer<typeof envSchema>;

// Configuration utilities
export const isDevelopment = config.NODE_ENV === "development";
export const isProduction = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";

// API endpoints
export const ENDPOINTS = {
  HEROES: "/heroes",
  HERO_STATS: "/heroStats",
  PRO_MATCHES: "/proMatches",
  MATCHUPS: "/matchups",
} as const;

// Cache keys
export const CACHE_KEYS = {
  HEROES: "heroes:all",
  HERO_STATS: "hero_stats:all",
  SUGGESTIONS: (enemyIds: number[], roleFilter?: string) =>
    `suggestions:${enemyIds.sort().join(",")}_${roleFilter || "all"}`,
  MATCHUPS: (heroId: number) => `matchups:${heroId}`,
} as const;

// Rate limiting configuration
export const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: config.OPENDOTA_RATE_LIMIT,
  DELAY_BETWEEN_REQUESTS: Math.ceil(60000 / config.OPENDOTA_RATE_LIMIT),
} as const;

export default config;
