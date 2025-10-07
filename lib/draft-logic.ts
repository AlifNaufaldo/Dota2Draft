import {
  Hero,
  HeroStats,
  DraftSuggestion,
  DraftState,
  HeroMatchupData,
  Role,
} from "./types";
import { calculateWinRate } from "./opendota";
import { DraftAnalyzerIntegration } from "./draft-integration";
import { GameContext as AdvancedGameContext } from "./advanced-draft-analyzer";
// Advanced analyzer functionality integrated directly

// Enhanced interfaces for advanced analysis
export interface AdvancedScoreBreakdown {
  meta: number;
  counter: number;
  synergy: number;
  itemSynergy: number;
  laneOptimization: number;
  timing: number;
  proPattern: number;
  mlSynergy: number;
}

export interface GameContext {
  expectedDuration?: number;
  preferredLanes?: number[];
  playstyle?: "aggressive" | "defensive" | "balanced";
  itemStrategy?: "early" | "scaling" | "utility";
}

export interface AdvancedDraftSuggestion extends DraftSuggestion {
  advancedBreakdown: AdvancedScoreBreakdown;
  itemRecommendations: string[];
  optimalLane: number;
  timingWindow: "early" | "mid" | "late";
  proPickRate: number;
}

export class DraftAnalyzer {
  private heroes: Hero[];
  private heroStats: HeroStats[];
  private matchupData: Map<number, HeroMatchupData[]>;
  private integration: DraftAnalyzerIntegration;

  constructor(heroes: Hero[], heroStats: HeroStats[]) {
    this.heroes = heroes;
    this.heroStats = heroStats;
    this.matchupData = new Map();
    this.integration = new DraftAnalyzerIntegration(heroes, heroStats);
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

  // Generate enhanced suggestions with advanced analytics
  async generateAdvancedSuggestions(
    draftState: DraftState,
    gameContext: GameContext = {},
    roleFilter?: Role[],
    limit: number = 10
  ): Promise<AdvancedDraftSuggestion[]> {
    try {
      // Convert GameContext to AdvancedGameContext
      const advancedContext: AdvancedGameContext = {
        expectedDuration: gameContext.expectedDuration,
        preferredLanes: gameContext.preferredLanes,
        playstyle: gameContext.playstyle,
        itemStrategy: gameContext.itemStrategy,
      };

      // Get advanced suggestions from integration layer
      const advancedSuggestions =
        await this.integration.getEnhancedRecommendations(draftState, {
          gameContext: advancedContext,
          roleFilter,
          includeItemBuilds: true,
          includeLaneOptimization: true,
          includeTimingAnalysis: true,
          includeProPatterns: true,
        });

      // Convert to AdvancedDraftSuggestion format
      const convertedSuggestions: AdvancedDraftSuggestion[] =
        advancedSuggestions.map((suggestion) => {
          const heroStats = this.heroStats.find(
            (hs) => hs.id === suggestion.hero.id
          );
          return {
            hero: suggestion.hero,
            score: suggestion.score,
            win_rate: heroStats
              ? calculateWinRate(heroStats.pub_win, heroStats.pub_pick)
              : 50,
            confidence:
              suggestion.score > 0.8
                ? "high"
                : suggestion.score > 0.6
                ? "medium"
                : "low",
            reasoning: suggestion.reasons,
            counters: [], // Will be populated if needed
            synergies: [], // Will be populated if needed
            advancedBreakdown: {
              meta: suggestion.breakdown.meta,
              counter: suggestion.breakdown.counter,
              synergy: suggestion.breakdown.synergy,
              itemSynergy: suggestion.breakdown.itemSynergy,
              laneOptimization: suggestion.breakdown.laneOptimization,
              timing: suggestion.breakdown.timing,
              proPattern: suggestion.breakdown.proPattern,
              mlSynergy: suggestion.breakdown.mlSynergy,
            },
            itemRecommendations:
              suggestion.itemSynergy.length > 0
                ? suggestion.itemSynergy[0].items
                : [],
            optimalLane:
              suggestion.laneOptimization.length > 0
                ? suggestion.laneOptimization.find(
                    (la) => la.hero.id === suggestion.hero.id
                  )?.position || 1
                : 1,
            timingWindow:
              suggestion.timingWindows.length > 0
                ? suggestion.timingWindows.reduce((best, current) =>
                    current.powerLevel > best.powerLevel ? current : best
                  ).phase
                : "mid",
            proPickRate:
              suggestion.proPatterns.firstPickRate +
              suggestion.proPatterns.situationalPickRate,
          };
        });

      return convertedSuggestions.slice(0, limit);
    } catch (error) {
      console.error("Error generating advanced suggestions:", error);
      // Fallback to basic suggestions
      return this.generateSuggestions(draftState, roleFilter, limit).map(
        (suggestion) => ({
          ...suggestion,
          advancedBreakdown: {
            meta: 0.5,
            counter: 0.5,
            synergy: 0.5,
            itemSynergy: 0.5,
            laneOptimization: 0.5,
            timing: 0.5,
            proPattern: 0.5,
            mlSynergy: 0.5,
          },
          itemRecommendations: [],
          optimalLane: 1,
          timingWindow: "mid" as const,
          proPickRate: 0.3,
        })
      );
    }
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

  // Calculate advanced comprehensive score with enhanced analytics
  private calculateAdvancedHeroScore(
    hero: Hero,
    draftState: DraftState,
    gameContext: GameContext
  ): AdvancedDraftSuggestion {
    const enemyHeroes = draftState.enemyTeam.filter(
      (h) => h !== null
    ) as Hero[];
    const teamHeroes = draftState.yourTeam.filter((h) => h !== null) as Hero[];

    // Calculate all score components
    const advancedBreakdown: AdvancedScoreBreakdown = {
      meta: this.getMetaScore(hero.id),
      counter: this.getCounterScore(hero.id, enemyHeroes),
      synergy: this.getSynergyScore(hero.id, teamHeroes),
      itemSynergy: this.calculateItemSynergyScore(
        hero,
        teamHeroes,
        gameContext
      ),
      laneOptimization: this.calculateLaneOptimizationScore(
        hero,
        draftState,
        gameContext
      ),
      timing: this.calculateTimingScore(hero, gameContext),
      proPattern: this.calculateProPatternScore(hero.id),
      mlSynergy: this.calculateMLSynergyScore(hero, teamHeroes),
    };

    // Calculate weighted final score with enhanced weighting
    const finalScore =
      advancedBreakdown.meta * 0.15 +
      advancedBreakdown.counter * 0.2 +
      advancedBreakdown.synergy * 0.15 +
      advancedBreakdown.itemSynergy * 0.15 +
      advancedBreakdown.laneOptimization * 0.1 +
      advancedBreakdown.timing * 0.1 +
      advancedBreakdown.proPattern * 0.1 +
      advancedBreakdown.mlSynergy * 0.05;

    // Get confidence level
    const confidence = this.getConfidenceLevel(finalScore, enemyHeroes.length);

    // Generate enhanced reasoning
    const reasoning = this.generateAdvancedReasoning(
      hero,
      advancedBreakdown,
      gameContext
    );

    // Get hero stats for win rate
    const heroStat = this.heroStats.find((stat) => stat.id === hero.id);
    const winRate = heroStat
      ? calculateWinRate(heroStat.pub_win, heroStat.pub_pick)
      : 50;

    // Calculate additional advanced features
    const itemRecommendations = this.getItemRecommendations(hero, gameContext);
    const optimalLane = this.getOptimalLane(hero);
    const timingWindow = this.getTimingWindow(hero, gameContext);
    const proPickRate = this.getProPickRate(hero.id);

    return {
      hero,
      score: Math.round(finalScore),
      win_rate: winRate,
      confidence,
      reasoning: reasoning.positive,
      counters: reasoning.counters,
      synergies: reasoning.synergies,
      advancedBreakdown,
      itemRecommendations,
      optimalLane,
      timingWindow,
      proPickRate,
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

  // Advanced analysis methods
  private calculateItemSynergyScore(
    hero: Hero,
    teamHeroes: Hero[],
    gameContext: GameContext
  ): number {
    let synergyScore = 50;

    // Item build synergy based on hero role and team composition
    if (hero.roles.includes("Carry")) {
      const hasSupport = teamHeroes.some((h) => h.roles.includes("Support"));
      if (hasSupport) synergyScore += 15;
    }

    if (hero.roles.includes("Support")) {
      const hasCores = teamHeroes.some((h) => h.roles.includes("Carry"));
      if (hasCores) synergyScore += 20;
    }

    // Context-based adjustments
    if (
      gameContext.itemStrategy === "early" &&
      hero.roles.includes("Support")
    ) {
      synergyScore += 10;
    } else if (
      gameContext.itemStrategy === "scaling" &&
      hero.roles.includes("Carry")
    ) {
      synergyScore += 15;
    }

    return Math.min(100, Math.max(0, synergyScore));
  }

  private calculateLaneOptimizationScore(
    hero: Hero,
    draftState: DraftState,
    gameContext: GameContext
  ): number {
    let laneScore = 50;
    const optimalLane = this.getOptimalLane(hero);

    // Check if preferred lanes match
    if (gameContext.preferredLanes?.includes(optimalLane)) {
      laneScore += 20;
    }

    // Check lane conflicts with existing team
    const teamHeroes = draftState.yourTeam.filter((h) => h !== null) as Hero[];
    const laneConflicts = teamHeroes.filter(
      (teammate) => this.getOptimalLane(teammate) === optimalLane
    ).length;

    laneScore -= laneConflicts * 15;

    return Math.min(100, Math.max(0, laneScore));
  }

  private calculateTimingScore(hero: Hero, gameContext: GameContext): number {
    if (!gameContext.expectedDuration) return 50;

    const timingWindow = this.getTimingWindow(hero, gameContext);

    // Score based on how well hero fits expected game duration
    if (gameContext.expectedDuration <= 25 && timingWindow === "early") {
      return 85;
    } else if (
      gameContext.expectedDuration >= 25 &&
      gameContext.expectedDuration <= 45 &&
      timingWindow === "mid"
    ) {
      return 80;
    } else if (gameContext.expectedDuration >= 45 && timingWindow === "late") {
      return 90;
    }

    return 60;
  }

  private calculateProPatternScore(heroId: number): number {
    // Simplified pro pattern scoring based on hero ID
    const heroStat = this.heroStats.find((stat) => stat.id === heroId);
    if (!heroStat) return 50;

    // Use pro scene metrics if available, otherwise use pub stats as approximation
    const proWinRate = heroStat.pro_win || heroStat.pub_win;
    const proPicks = heroStat.pro_pick || heroStat.pub_pick;

    if (proPicks === 0) return 30; // Rarely picked in pro scene

    const winRate = (proWinRate / proPicks) * 100;
    return Math.min(100, Math.max(0, winRate));
  }

  private calculateMLSynergyScore(hero: Hero, teamHeroes: Hero[]): number {
    if (teamHeroes.length === 0) return 50;

    let synergyScore = 0;

    teamHeroes.forEach((teammate) => {
      let pairSynergy = 50;

      // Attribute diversity bonus
      if (hero.primary_attr !== teammate.primary_attr) {
        pairSynergy += 10;
      }

      // Role complementarity
      const supportRoles = ["Support", "Disabler"];
      const coreRoles = ["Carry", "Nuker"];

      const heroIsSupport = hero.roles.some((role) =>
        supportRoles.includes(role)
      );
      const teammateIsCore = teammate.roles.some((role) =>
        coreRoles.includes(role)
      );

      if (heroIsSupport && teammateIsCore) {
        pairSynergy += 20;
      }

      // Attack type diversity
      if (hero.attack_type !== teammate.attack_type) {
        pairSynergy += 5;
      }

      synergyScore += pairSynergy;
    });

    return Math.min(100, Math.max(0, synergyScore / teamHeroes.length));
  }

  private generateAdvancedReasoning(
    hero: Hero,
    breakdown: AdvancedScoreBreakdown,
    gameContext: GameContext
  ): { positive: string[]; counters: string[]; synergies: string[] } {
    const positive: string[] = [];
    const counters: string[] = [];
    const synergies: string[] = [];

    // Meta reasoning
    if (breakdown.meta > 70) {
      positive.push("Strong in current meta");
    }

    // Counter reasoning
    if (breakdown.counter > 70) {
      positive.push("Excellent counter to enemy team");
      counters.push("Counters enemy cores effectively");
    }

    // Synergy reasoning
    if (breakdown.synergy > 70) {
      positive.push("Great synergy with team composition");
      synergies.push("Complements team strategy");
    }

    // Item synergy
    if (breakdown.itemSynergy > 70) {
      positive.push("Strong item build synergies");
    }

    // Lane optimization
    if (breakdown.laneOptimization > 75) {
      positive.push("Optimal lane assignment available");
    }

    // Timing
    if (breakdown.timing > 75) {
      positive.push("Perfect timing for expected game duration");
    }

    // Pro patterns
    if (breakdown.proPattern > 70) {
      positive.push("Proven effective in professional scene");
    }

    // ML synergy
    if (breakdown.mlSynergy > 75) {
      positive.push("AI predicts exceptional team synergy");
    }

    // Context-based reasoning
    if (
      gameContext.playstyle === "aggressive" &&
      hero.roles.includes("Initiator")
    ) {
      positive.push("Fits aggressive playstyle perfectly");
    }

    return { positive, counters, synergies };
  }

  private getItemRecommendations(
    hero: Hero,
    gameContext: GameContext
  ): string[] {
    const items: string[] = [];

    // Role-based recommendations
    if (hero.roles.includes("Carry")) {
      items.push("Power Treads", "Battle Fury", "Black King Bar");
      if (gameContext.itemStrategy === "scaling") {
        items.push("Heart of Tarrasque", "Satanic");
      }
    } else if (hero.roles.includes("Support")) {
      items.push("Arcane Boots", "Force Staff", "Glimmer Cape");
      if (gameContext.itemStrategy === "utility") {
        items.push("Aether Lens", "Ghost Scepter");
      }
    } else if (hero.roles.includes("Initiator")) {
      items.push("Blink Dagger", "Pipe of Insight", "Crimson Guard");
    } else {
      items.push("Bottle", "Boots of Travel", "Black King Bar");
    }

    return items.slice(0, 5);
  }

  private getOptimalLane(hero: Hero): number {
    // Position 1-5 (Carry, Mid, Offlane, Soft Support, Hard Support)
    if (hero.roles.includes("Carry")) return 1;
    if (hero.roles.includes("Support")) return 5;
    if (hero.roles.includes("Initiator")) return 3;
    if (hero.primary_attr === "int") return 2;
    return 4; // Default to position 4
  }

  private getTimingWindow(
    hero: Hero,
    gameContext: GameContext
  ): "early" | "mid" | "late" {
    if (hero.roles.includes("Support") || hero.roles.includes("Disabler")) {
      return "early";
    } else if (hero.roles.includes("Carry")) {
      return gameContext.itemStrategy === "early" ? "mid" : "late";
    } else {
      return "mid";
    }
  }

  private getProPickRate(heroId: number): number {
    const heroStat = this.heroStats.find((stat) => stat.id === heroId);
    if (!heroStat) return 0;

    const proPicks = heroStat.pro_pick || 0;
    const totalProGames = 1000; // Approximate total pro games

    return (proPicks / totalProGames) * 100;
  }

  // Advanced suggestion methods using integration layer
  async getCounterPickSuggestions(
    draftState: DraftState,
    targetEnemyHero: Hero
  ): Promise<AdvancedDraftSuggestion[]> {
    const suggestions = await this.integration.getCounterPickRecommendations(
      draftState,
      targetEnemyHero
    );

    return suggestions.map((suggestion) => ({
      hero: suggestion.hero,
      score: suggestion.score,
      win_rate: this.heroStats.find((hs) => hs.id === suggestion.hero.id)
        ? calculateWinRate(
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_win,
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_pick
          )
        : 50,
      confidence:
        suggestion.score > 0.8
          ? "high"
          : suggestion.score > 0.6
          ? "medium"
          : "low",
      reasoning: suggestion.reasons,
      counters: [],
      synergies: [],
      advancedBreakdown: suggestion.breakdown,
      itemRecommendations:
        suggestion.itemSynergy.length > 0
          ? suggestion.itemSynergy[0].items
          : [],
      optimalLane:
        suggestion.laneOptimization.length > 0
          ? suggestion.laneOptimization.find(
              (la) => la.hero.id === suggestion.hero.id
            )?.position || 1
          : 1,
      timingWindow:
        suggestion.timingWindows.length > 0
          ? suggestion.timingWindows.reduce((best, current) =>
              current.powerLevel > best.powerLevel ? current : best
            ).phase
          : "mid",
      proPickRate:
        suggestion.proPatterns.firstPickRate +
        suggestion.proPatterns.situationalPickRate,
    }));
  }

  async getSynergyPickSuggestions(
    draftState: DraftState
  ): Promise<AdvancedDraftSuggestion[]> {
    const suggestions = await this.integration.getSynergyRecommendations(
      draftState
    );

    return suggestions.map((suggestion) => ({
      hero: suggestion.hero,
      score: suggestion.score,
      win_rate: this.heroStats.find((hs) => hs.id === suggestion.hero.id)
        ? calculateWinRate(
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_win,
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_pick
          )
        : 50,
      confidence:
        suggestion.score > 0.8
          ? "high"
          : suggestion.score > 0.6
          ? "medium"
          : "low",
      reasoning: suggestion.reasons,
      counters: [],
      synergies: [],
      advancedBreakdown: suggestion.breakdown,
      itemRecommendations:
        suggestion.itemSynergy.length > 0
          ? suggestion.itemSynergy[0].items
          : [],
      optimalLane:
        suggestion.laneOptimization.length > 0
          ? suggestion.laneOptimization.find(
              (la) => la.hero.id === suggestion.hero.id
            )?.position || 1
          : 1,
      timingWindow:
        suggestion.timingWindows.length > 0
          ? suggestion.timingWindows.reduce((best, current) =>
              current.powerLevel > best.powerLevel ? current : best
            ).phase
          : "mid",
      proPickRate:
        suggestion.proPatterns.firstPickRate +
        suggestion.proPatterns.situationalPickRate,
    }));
  }

  async getLaneSpecificSuggestions(
    draftState: DraftState,
    lane: 1 | 2 | 3 | 4 | 5
  ): Promise<AdvancedDraftSuggestion[]> {
    const suggestions = await this.integration.getLaneRecommendations(
      draftState,
      lane
    );

    return suggestions.map((suggestion) => ({
      hero: suggestion.hero,
      score: suggestion.score,
      win_rate: this.heroStats.find((hs) => hs.id === suggestion.hero.id)
        ? calculateWinRate(
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_win,
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_pick
          )
        : 50,
      confidence:
        suggestion.score > 0.8
          ? "high"
          : suggestion.score > 0.6
          ? "medium"
          : "low",
      reasoning: suggestion.reasons,
      counters: [],
      synergies: [],
      advancedBreakdown: suggestion.breakdown,
      itemRecommendations:
        suggestion.itemSynergy.length > 0
          ? suggestion.itemSynergy[0].items
          : [],
      optimalLane:
        suggestion.laneOptimization.length > 0
          ? suggestion.laneOptimization.find(
              (la) => la.hero.id === suggestion.hero.id
            )?.position || 1
          : 1,
      timingWindow:
        suggestion.timingWindows.length > 0
          ? suggestion.timingWindows.reduce((best, current) =>
              current.powerLevel > best.powerLevel ? current : best
            ).phase
          : "mid",
      proPickRate:
        suggestion.proPatterns.firstPickRate +
        suggestion.proPatterns.situationalPickRate,
    }));
  }

  async getTimingBasedSuggestions(
    draftState: DraftState,
    targetPhase: "early" | "mid" | "late"
  ): Promise<AdvancedDraftSuggestion[]> {
    const suggestions = await this.integration.getTimingRecommendations(
      draftState,
      targetPhase
    );

    return suggestions.map((suggestion) => ({
      hero: suggestion.hero,
      score: suggestion.score,
      win_rate: this.heroStats.find((hs) => hs.id === suggestion.hero.id)
        ? calculateWinRate(
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_win,
            this.heroStats.find((hs) => hs.id === suggestion.hero.id)!.pub_pick
          )
        : 50,
      confidence:
        suggestion.score > 0.8
          ? "high"
          : suggestion.score > 0.6
          ? "medium"
          : "low",
      reasoning: suggestion.reasons,
      counters: [],
      synergies: [],
      advancedBreakdown: suggestion.breakdown,
      itemRecommendations:
        suggestion.itemSynergy.length > 0
          ? suggestion.itemSynergy[0].items
          : [],
      optimalLane:
        suggestion.laneOptimization.length > 0
          ? suggestion.laneOptimization.find(
              (la) => la.hero.id === suggestion.hero.id
            )?.position || 1
          : 1,
      timingWindow:
        suggestion.timingWindows.length > 0
          ? suggestion.timingWindows.reduce((best, current) =>
              current.powerLevel > best.powerLevel ? current : best
            ).phase
          : "mid",
      proPickRate:
        suggestion.proPatterns.firstPickRate +
        suggestion.proPatterns.situationalPickRate,
    }));
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
