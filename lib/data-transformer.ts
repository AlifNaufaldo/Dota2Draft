import { OpenDotaMatchupData, HeroMatchupData } from "./types";

/**
 * Data transformation utilities for converting between OpenDota API format
 * and internal application format
 */

export class DataTransformer {
  /**
   * Transform OpenDota matchup data to internal format
   */
  static transformMatchupData(
    openDotaData: OpenDotaMatchupData[]
  ): HeroMatchupData[] {
    return openDotaData.map((matchup) => ({
      hero_id: matchup.hero_id,
      games_played: matchup.games,
      wins: matchup.wins,
    }));
  }

  /**
   * Calculate win rate with safety checks
   */
  static calculateWinRate(wins: number, games: number): number {
    if (!games || games === 0) return 0;
    if (wins > games) {
      console.warn(`Invalid data: wins (${wins}) > games (${games})`);
      return 0;
    }
    return Number(((wins / games) * 100).toFixed(2));
  }

  /**
   * Validate hero data structure
   */
  static validateHeroData(hero: unknown): boolean {
    if (!hero || typeof hero !== "object") return false;

    const h = hero as Record<string, unknown>;
    return (
      typeof h.id === "number" &&
      typeof h.localized_name === "string" &&
      Array.isArray(h.roles) &&
      ["str", "agi", "int", "all"].includes(h.primary_attr as string)
    );
  }

  /**
   * Sanitize hero name for image URLs
   */
  static sanitizeHeroName(heroName: string): string {
    return heroName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }
}
