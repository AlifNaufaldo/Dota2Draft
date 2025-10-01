import {
  Hero,
  HeroStats,
  DraftSuggestion,
  DraftState,
  HeroMatchupData,
  Role,
} from "./types";
import { calculateWinRate } from "./opendota";

export class DraftAnalyzer {
  private heroes: Hero[];
  private heroStats: HeroStats[];
  private matchupData: Map<number, HeroMatchupData[]>;

  constructor(heroes: Hero[], heroStats: HeroStats[]) {
    this.heroes = heroes;
    this.heroStats = heroStats;
    this.matchupData = new Map();
  }

  // Set matchup data for heroes
  setMatchupData(heroId: number, matchups: HeroMatchupData[]): void {
    this.matchupData.set(heroId, matchups);
  }

  // Calculate draft suggestions based on current draft state
  generateSuggestions(
    draftState: DraftState,
    roleFilter?: Role[],
    limit: number = 10
  ): DraftSuggestion[] {
    const suggestions: DraftSuggestion[] = [];
    const pickedHeroes = new Set([
      ...draftState.yourTeam.filter((h) => h !== null).map((h) => h!.id),
      ...draftState.enemyTeam.filter((h) => h !== null).map((h) => h!.id),
    ]);

    // Get available heroes (not picked)
    const availableHeroes = this.heroes.filter(
      (hero) => !pickedHeroes.has(hero.id)
    );

    for (const hero of availableHeroes) {
      // Apply role filter if specified
      if (roleFilter && roleFilter.length > 0) {
        const heroRoles = hero.roles;
        const hasMatchingRole = roleFilter.some((filterRole) =>
          heroRoles.includes(filterRole)
        );
        if (!hasMatchingRole) continue;
      }

      const suggestion = this.calculateHeroScore(hero, draftState);
      suggestions.push(suggestion);
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, limit);
  }

  // Calculate comprehensive score for a hero based on draft state
  private calculateHeroScore(
    hero: Hero,
    draftState: DraftState
  ): DraftSuggestion {
    const enemyHeroes = draftState.enemyTeam.filter(
      (h) => h !== null
    ) as Hero[];
    const teamHeroes = draftState.yourTeam.filter((h) => h !== null) as Hero[];

    // Base meta score (20% weight)
    const metaScore = this.getMetaScore(hero.id);

    // Counter score against enemy team (40% weight)
    const counterScore = this.getCounterScore(hero.id, enemyHeroes);

    // Synergy score with your team (30% weight)
    const synergyScore = this.getSynergyScore(hero.id, teamHeroes);

    // Pro scene popularity (10% weight)
    const proScore = this.getProScore(hero.id);

    // Calculate weighted final score
    const finalScore =
      metaScore * 0.2 +
      counterScore * 0.4 +
      synergyScore * 0.3 +
      proScore * 0.1;

    // Determine confidence level
    const confidence = this.getConfidenceLevel(finalScore, enemyHeroes.length);

    // Generate reasoning
    const reasoning = this.generateReasoning(hero, enemyHeroes, teamHeroes, {
      metaScore,
      counterScore,
      synergyScore,
      proScore,
    });

    // Get hero stats for win rate
    const heroStat = this.heroStats.find((stat) => stat.id === hero.id);
    const winRate = heroStat
      ? calculateWinRate(heroStat.pub_win, heroStat.pub_pick)
      : 50;

    return {
      hero,
      score: Math.round(finalScore),
      win_rate: winRate,
      confidence,
      reasoning: reasoning.positive,
      counters: reasoning.counters,
      synergies: reasoning.synergies,
    };
  }

  // Calculate meta score based on current patch performance
  private getMetaScore(heroId: number): number {
    const heroStat = this.heroStats.find((stat) => stat.id === heroId);
    if (!heroStat) return 50;

    // Combine win rate and pick rate for meta relevance
    const currentWinRate = calculateWinRate(
      heroStat.pub_win,
      heroStat.pub_pick
    );
    const normalizedWinRate = ((currentWinRate - 45) / 10) * 100; // Scale around 50% baseline
    const totalPicks = Object.keys(heroStat)
      .filter((key) => key.endsWith("_pick"))
      .reduce(
        (sum, key) => sum + (heroStat[key as keyof HeroStats] as number),
        0
      );
    const normalizedPickRate = Math.min(
      (heroStat.pub_pick / Math.max(totalPicks, 1)) * 100,
      100
    ); // Scale pick rate

    return Math.max(
      0,
      Math.min(100, (normalizedWinRate + normalizedPickRate) / 2)
    );
  }

  // Calculate counter effectiveness against enemy heroes
  private getCounterScore(heroId: number, enemyHeroes: Hero[]): number {
    if (enemyHeroes.length === 0) return 50;

    const matchups = this.matchupData.get(heroId);
    if (!matchups) return 50;

    let totalScore = 0;
    let validMatchups = 0;

    for (const enemy of enemyHeroes) {
      const matchup = matchups.find((m) => m.hero_id === enemy.id);
      if (matchup && matchup.games_played > 10) {
        // Minimum sample size
        const winRate = calculateWinRate(matchup.wins, matchup.games_played);
        totalScore += winRate;
        validMatchups++;
      }
    }

    return validMatchups > 0 ? totalScore / validMatchups : 50;
  }

  // Calculate synergy score with team heroes
  private getSynergyScore(heroId: number, teamHeroes: Hero[]): number {
    if (teamHeroes.length === 0) return 50;

    // This is a simplified synergy calculation
    // In a real implementation, you'd want team composition analysis
    const hero = this.heroes.find((h) => h.id === heroId);
    if (!hero) return 50;

    let synergyScore = 50;

    // Role-based synergy (simplified)
    const heroRoles = hero.roles;
    const teamRoles = teamHeroes.flatMap((h) => h.roles);

    // Bonus for complementary roles
    if (heroRoles.includes("Support") && teamRoles.includes("Carry")) {
      synergyScore += 10;
    }
    if (heroRoles.includes("Initiator") && teamRoles.includes("Nuker")) {
      synergyScore += 8;
    }
    if (heroRoles.includes("Disabler") && teamRoles.includes("Carry")) {
      synergyScore += 6;
    }

    // Penalty for role overlap
    const roleOverlap = heroRoles.filter((role) =>
      teamRoles.includes(role)
    ).length;
    synergyScore -= roleOverlap * 5;

    return Math.max(0, Math.min(100, synergyScore));
  }

  // Calculate professional scene popularity score
  private getProScore(heroId: number): number {
    // This would be calculated from pro match data
    // For now, return a baseline score
    const heroStat = this.heroStats.find((stat) => stat.id === heroId);
    if (!heroStat) return 50;
    const totalPicks =
      heroStat.pub_pick + heroStat.pro_pick + heroStat.turbo_picks;
    const pickRate =
      totalPicks > 0 ? (heroStat.pub_pick / totalPicks) * 100 : 50;
    return Math.min(pickRate, 100);
  }

  // Determine confidence level based on sample size and enemy picks
  private getConfidenceLevel(
    score: number,
    enemyPickCount: number
  ): "high" | "medium" | "low" {
    if (enemyPickCount >= 4 && score > 70) return "high";
    if (enemyPickCount >= 2 && score > 60) return "medium";
    return "low";
  }

  // Generate human-readable reasoning for the suggestion
  private generateReasoning(
    hero: Hero,
    enemyHeroes: Hero[],
    teamHeroes: Hero[],
    scores: {
      metaScore: number;
      counterScore: number;
      synergyScore: number;
      proScore: number;
    }
  ): { positive: string[]; counters: string[]; synergies: string[] } {
    const reasoning: string[] = [];
    const counters: string[] = [];
    const synergies: string[] = [];

    // Meta reasoning
    if (scores.metaScore > 70) {
      reasoning.push("Strong in current meta");
    } else if (scores.metaScore < 40) {
      reasoning.push("Below average meta performance");
    }

    // Counter reasoning
    if (scores.counterScore > 65) {
      reasoning.push("Good matchups against enemy picks");
      enemyHeroes.forEach((enemy) => {
        counters.push(`Effective vs ${enemy.localized_name}`);
      });
    } else if (scores.counterScore < 45) {
      reasoning.push("Difficult matchups against enemy team");
    }

    // Synergy reasoning
    if (scores.synergyScore > 60) {
      reasoning.push("Good synergy with team composition");
      teamHeroes.forEach((teammate) => {
        synergies.push(`Synergizes with ${teammate.localized_name}`);
      });
    }

    // Role-specific reasoning
    if (hero.roles.includes("Carry")) {
      reasoning.push("Strong late-game potential");
    }
    if (hero.roles.includes("Support")) {
      reasoning.push("Provides team utility");
    }
    if (hero.roles.includes("Initiator")) {
      reasoning.push("Good team fight initiation");
    }

    return { positive: reasoning, counters, synergies };
  }
}

// Utility function to filter heroes by role
export const filterHeroesByRole = (heroes: Hero[], roles: Role[]): Hero[] => {
  return heroes.filter((hero) =>
    roles.some((role) => hero.roles.includes(role))
  );
};

// Utility function to get role color for UI
export const getRoleColor = (role: Role): string => {
  const colors: Record<Role, string> = {
    Carry: "bg-red-500",
    Support: "bg-green-500",
    Initiator: "bg-blue-500",
    Disabler: "bg-purple-500",
    Jungler: "bg-yellow-500",
    Durable: "bg-gray-500",
    Escape: "bg-pink-500",
    Pusher: "bg-orange-500",
    Nuker: "bg-indigo-500",
  };

  return colors[role] || "bg-gray-400";
};
