import axios from "axios";
import {
  Hero,
  HeroStats,
  OpenDotaMatch,
  ProMatch,
  OpenDotaMatchupData,
} from "./types";

const OPENDOTA_API_BASE = "https://api.opendota.com/api";

// Create axios instance with rate limiting considerations
const openDotaClient = axios.create({
  baseURL: OPENDOTA_API_BASE,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

// Add request interceptor for rate limiting
openDotaClient.interceptors.request.use((config) => {
  // OpenDota allows 60 requests per minute for free tier
  return config;
});

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
          less_than_match_id: null, // Start from most recent
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

  // Get hero matchup data
  static async getHeroMatchups(heroId: number): Promise<OpenDotaMatchupData[]> {
    try {
      const response = await openDotaClient.get(`/heroes/${heroId}/matchups`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching matchups for hero ${heroId}:`, error);
      throw new Error("Failed to fetch hero matchup data");
    }
  }

  // Get specific hero details
  static async getHeroDetails(heroId: number): Promise<Hero> {
    try {
      const response = await openDotaClient.get(`/heroes/${heroId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for hero ${heroId}:`, error);
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
