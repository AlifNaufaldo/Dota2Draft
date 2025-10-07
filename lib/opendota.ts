import axios from "axios";
import {
  Hero,
  HeroStats,
  OpenDotaMatch,
  ProMatch,
  OpenDotaMatchupData,
} from "./types";

const OPENDOTA_API_BASE = "https://api.opendota.com/api";

// Create axios instance with increased timeout and retry logic
const openDotaClient = axios.create({
  baseURL: OPENDOTA_API_BASE,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    Accept: "application/json",
  },
});

// Add retry interceptor
openDotaClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry logic for timeout and network errors
    if (
      !config._retry &&
      (error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        (error.response && error.response.status >= 500))
    ) {
      config._retry = true;
      console.log(
        `🔄 Retrying request to ${config.url} due to ${
          error.code || error.response?.status
        }`
      );

      // Wait 2 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return openDotaClient(config);
    }

    return Promise.reject(error);
  }
);

export class OpenDotaAPI {
  // Get all heroes
  static async getHeroes(): Promise<Hero[]> {
    try {
      const response = await openDotaClient.get("/heroes");
      return response.data;
    } catch (error) {
      console.error("Error fetching heroes:", error);
      throw new Error("Failed to fetch heroes data");
    }
  }

  // Get hero statistics for current meta
  static async getHeroStats(): Promise<HeroStats[]> {
    try {
      const response = await openDotaClient.get("/heroStats");
      return response.data;
    } catch (error) {
      console.error("Error fetching hero stats:", error);
      throw new Error("Failed to fetch hero statistics");
    }
  }

  // Get recent matches for meta analysis (last 7 days)
  static async getRecentMatches(limit: number = 100): Promise<OpenDotaMatch[]> {
    try {
      const sevenDaysAgo = Math.floor(
        (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000
      );

      const response = await openDotaClient.get("/publicMatches", {
        params: {
          min_time: sevenDaysAgo,
          less_than_match_id: null,
        },
      });

      return response.data.slice(0, limit);
    } catch (error) {
      console.error("Error fetching recent matches:", error);
      throw new Error("Failed to fetch recent matches");
    }
  }

  // Get professional matches for higher quality data
  static async getProMatches(limit: number = 50): Promise<ProMatch[]> {
    try {
      const response = await openDotaClient.get("/proMatches");

      // Filter for matches from last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentMatches = response.data.filter(
        (match: ProMatch) => match.start_time * 1000 > sevenDaysAgo
      );

      return recentMatches.slice(0, limit);
    } catch (error) {
      console.error("Error fetching pro matches:", error);
      throw new Error("Failed to fetch professional matches");
    }
  }

  // Get hero matchup data - FIXED WITH BETTER ERROR HANDLING
  static async getHeroMatchups(heroId: number): Promise<OpenDotaMatchupData[]> {
    try {
      console.log(`🔍 Fetching matchups for hero ${heroId}...`);
      const response = await openDotaClient.get(`/heroes/${heroId}/matchups`);
      console.log(`✅ Successfully fetched matchups for hero ${heroId}`);
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorCode = (error as { code?: string })?.code || "UNKNOWN";
      const errorStatus =
        (error as { response?: { status?: number } })?.response?.status ||
        "NO_STATUS";

      console.error(`❌ Error fetching matchups for hero ${heroId}:`, {
        message: errorMessage,
        code: errorCode,
        status: errorStatus,
        url: `/heroes/${heroId}/matchups`,
      });

      throw new Error(
        `Failed to fetch hero matchup data for hero ${heroId}: ${errorMessage}`
      );
    }
  }

  // Get specific hero details
  static async getHeroDetails(heroId: number): Promise<Hero> {
    try {
      const response = await openDotaClient.get(`/heroes/${heroId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching hero details for ${heroId}:`, error);
      throw new Error("Failed to fetch hero details");
    }
  }
}

// Utility function to calculate win rate from wins/games
export const calculateWinRate = (wins: number, games: number): number => {
  if (games === 0) return 0;
  return Number(((wins / games) * 100).toFixed(2));
};

// Utility function to get hero image URL
export const getHeroImageUrl = (
  heroName: string,
  type: "icon" | "portrait" = "portrait"
): string => {
  // Clean hero name to match OpenDota/Steam CDN format
  const cleanName = heroName
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^npc_dota_hero_/, "") // Remove prefix if present
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (type === "icon") {
    // Use Steam CDN for hero icons
    return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${cleanName}_icon.png`;
  }

  // Use Steam CDN for full hero images
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${cleanName}_full.png`;
};

// Alternative: Get hero image by ID using OpenDota CDN
export const getHeroImageById = (
  heroId: number,
  type: "icon" | "portrait" = "portrait"
): string => {
  // This requires the hero name, so we'll use a fallback approach
  // For now, use the Steam CDN with common hero name patterns
  const steamBaseUrl =
    "https://cdn.cloudflare.steamstatic.com/apps/dota2/images";

  if (type === "icon") {
    return `${steamBaseUrl}/dota_react/heroes/icons/${heroId}.png`;
  }

  return `${steamBaseUrl}/dota_react/heroes/${heroId}.png`;
};
