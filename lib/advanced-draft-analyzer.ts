/**
 * Advanced Draft Analytics - Enhanced recommendation system
 * Implements: Item synergy, Lane optimization, Timing analysis, Pro patterns, ML synergy
 */

import { Hero, HeroStats, DraftState, Role } from "./types";

// Core interfaces for advanced analytics
export interface ItemBuild {
  name: string;
  items: string[];
  timing: number[];
  effectiveness: number;
  gamePhase: "early" | "mid" | "late";
}

export interface LaneAssignment {
  position: 1 | 2 | 3 | 4 | 5; // Carry, Mid, Off, Soft Support, Hard Support
  hero: Hero;
  confidence: number;
  reasoning: string[];
}

export interface TimingWindow {
  phase: "early" | "mid" | "late";
  start: number;
  end: number;
  powerLevel: number;
  keyItems: string[];
  objectives: string[];
}

export interface ProPattern {
  pickOrder: number;
  banPriority: number;
  firstPickRate: number;
  situationalPickRate: number;
  pairings: { heroId: number; synergy: number }[];
  counters: { heroId: number; effectiveness: number }[];
}

export interface GameContext {
  expectedDuration?: number;
  preferredLanes?: number[];
  playstyle?: "aggressive" | "defensive" | "balanced";
  itemStrategy?: "early" | "scaling" | "utility";
}

export interface ScoreBreakdown {
  meta: number;
  counter: number;
  synergy: number;
  itemSynergy: number;
  laneOptimization: number;
  timing: number;
  proPattern: number;
  mlSynergy: number;
}

export interface AdvancedSuggestion {
  hero: Hero;
  score: number;
  reasons: string[];
  breakdown: ScoreBreakdown;
  itemSynergy: ItemBuild[];
  laneOptimization: LaneAssignment[];
  timingWindows: TimingWindow[];
  proPatterns: ProPattern;
}

export interface AdvancedHeroAnalysis {
  hero: Hero;
  itemBuilds: ItemBuild[];
  laneFlexibility: LaneAssignment[];
  timingWindows: TimingWindow[];
  proPatterns: ProPattern;
  mlSynergyScore: number;
  contextualFactors: {
    patchTrend: number;
    metaPosition: number;
    adaptability: number;
  };
}

/**
 * ML Synergy Predictor - Predicts team synergy using patterns
 */
class MLSynergyPredictor {
  predictHeroSynergy(hero1: Hero, hero2: Hero): number {
    let synergy = 0.5; // Base synergy

    // Role compatibility
    const supportRoles = ["Support", "Disabler"];
    const coreRoles = ["Carry", "Nuker", "Pusher"];

    const hero1IsSupport = hero1.roles?.some((role: string) =>
      supportRoles.includes(role)
    );
    const hero2IsCore = hero2.roles?.some((role: string) =>
      coreRoles.includes(role)
    );

    if (hero1IsSupport && hero2IsCore) synergy += 0.2;
    if (hero1.attack_type !== hero2.attack_type) synergy += 0.05;

    return Math.min(1, Math.max(0, synergy));
  }

  predictTeamSynergy(heroes: Hero[]): number {
    if (heroes.length < 2) return 0.5;

    let totalSynergy = 0;
    let pairCount = 0;

    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        totalSynergy += this.predictHeroSynergy(heroes[i], heroes[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSynergy / pairCount : 0.5;
  }
}

/**
 * Item Build Analyzer - Analyzes item synergies and builds
 */
class ItemBuildAnalyzer {
  generateItemBuilds(hero: Hero, gameContext: GameContext): ItemBuild[] {
    const builds: ItemBuild[] = [];

    // Adjust builds based on game context
    const isEarlyGame =
      gameContext.expectedDuration && gameContext.expectedDuration < 30;
    const isLateGame =
      gameContext.expectedDuration && gameContext.expectedDuration > 45;
    const isAggressive = gameContext.playstyle === "aggressive";

    // Core builds based on hero roles
    if (hero.roles?.includes("Carry")) {
      const carryBuild: ItemBuild = {
        name: isEarlyGame ? "Early Game Carry" : "Carry Build",
        items: isEarlyGame
          ? ["power_treads", "drums", "black_king_bar", "desolator"]
          : ["power_treads", "battle_fury", "black_king_bar", "daedalus"],
        timing: isEarlyGame ? [6, 12, 20, 28] : [8, 18, 25, 35],
        effectiveness: isAggressive ? 0.9 : 0.85,
        gamePhase: isEarlyGame ? "early" : "mid",
      };
      builds.push(carryBuild);
    }

    if (hero.roles?.includes("Support")) {
      builds.push({
        name: "Support Build",
        items: ["arcane_boots", "force_staff", "glimmer_cape", "aether_lens"],
        timing: [6, 15, 25, 35],
        effectiveness: 0.8,
        gamePhase: "early",
      });
    }

    if (hero.roles?.includes("Initiator")) {
      builds.push({
        name: "Initiator Build",
        items: ["blink_dagger", "black_king_bar", "pipe", "crimson_guard"],
        timing: [12, 20, 30, 40],
        effectiveness: 0.75,
        gamePhase: "mid",
      });
    }

    if (hero.roles?.includes("Nuker")) {
      builds.push({
        name: "Nuker Build",
        items: ["arcane_boots", "aether_lens", "aghanims_scepter", "refresher"],
        timing: [10, 18, 28, 45],
        effectiveness: 0.9,
        gamePhase: isLateGame ? "late" : "mid",
      });
    }

    return builds;
  }

  calculateItemSynergy(hero: Hero, teamHeroes: Hero[]): number {
    // Calculate how well hero's items synergize with team
    let synergy = 0.5;

    if (
      hero.roles?.includes("Support") &&
      teamHeroes.some((h) => h.roles?.includes("Carry"))
    ) {
      synergy += 0.3;
    }

    return Math.min(1, synergy);
  }
}

/**
 * Lane Optimizer - Optimizes lane assignments
 */
class LaneOptimizer {
  optimizeLanes(heroes: Hero[]): LaneAssignment[] {
    const assignments: LaneAssignment[] = [];

    heroes.forEach((hero) => {
      const position = this.determineOptimalPosition(hero, heroes);
      assignments.push({
        position,
        hero,
        confidence: this.calculatePositionConfidence(hero, position),
        reasoning: this.getPositionReasoning(hero, position),
      });
    });

    return assignments;
  }

  private determineOptimalPosition(
    hero: Hero,
    teamHeroes: Hero[]
  ): 1 | 2 | 3 | 4 | 5 {
    // Check what positions are already taken
    const takenPositions = new Set<number>();
    teamHeroes.forEach((h) => {
      if (h.roles?.includes("Carry")) takenPositions.add(1);
      if (h.roles?.includes("Nuker")) takenPositions.add(2);
      if (h.roles?.includes("Initiator")) takenPositions.add(3);
      if (h.roles?.includes("Support")) takenPositions.add(5);
    });

    // Assign based on hero roles and available positions
    if (hero.roles?.includes("Carry") && !takenPositions.has(1)) return 1;
    if (hero.roles?.includes("Nuker") && !takenPositions.has(2)) return 2;
    if (hero.roles?.includes("Initiator") && !takenPositions.has(3)) return 3;
    if (hero.roles?.includes("Support") && !takenPositions.has(5)) return 5;

    // Find first available position
    for (let pos = 1; pos <= 5; pos++) {
      if (!takenPositions.has(pos)) return pos as 1 | 2 | 3 | 4 | 5;
    }

    return 4; // Default to position 4
  }

  private calculatePositionConfidence(hero: Hero, position: number): number {
    // Calculate confidence based on hero's attributes and roles
    let confidence = 0.5;

    // Higher confidence if hero's primary role matches position
    if (position === 1 && hero.roles?.includes("Carry")) confidence += 0.4;
    if (position === 2 && hero.roles?.includes("Nuker")) confidence += 0.4;
    if (position === 3 && hero.roles?.includes("Initiator")) confidence += 0.4;
    if (position === 4 && hero.roles?.includes("Support")) confidence += 0.3;
    if (position === 5 && hero.roles?.includes("Support")) confidence += 0.4;

    // Attribute bonuses based on primary attribute
    if (position === 1 && hero.primary_attr === "agi") confidence += 0.1;
    if (position === 2 && hero.primary_attr === "int") confidence += 0.1;
    if (position === 3 && hero.primary_attr === "str") confidence += 0.1;

    return Math.min(1, confidence);
  }

  private getPositionReasoning(hero: Hero, position: number): string[] {
    const reasons = [];
    if (position === 1) reasons.push("Strong late game scaling");
    if (position === 2) reasons.push("High burst damage potential");
    if (position === 3) reasons.push("Initiator and space creator");
    if (position === 4) reasons.push("Utility and roaming potential");
    if (position === 5) reasons.push("Strong support abilities");
    return reasons;
  }
}

/**
 * Timing Analyzer - Analyzes power spikes and timing windows
 */
class TimingAnalyzer {
  analyzeTimingWindows(hero: Hero, gameContext: GameContext): TimingWindow[] {
    const windows: TimingWindow[] = [];

    // Adjust timing windows based on context
    const expectedDuration = gameContext.expectedDuration || 40;
    const isAggressive = gameContext.playstyle === "aggressive";

    // Early game window
    windows.push({
      phase: "early",
      start: 0,
      end: isAggressive ? 12 : 15,
      powerLevel: this.calculateEarlyPower(hero),
      keyItems:
        gameContext.itemStrategy === "early"
          ? ["boots", "magic_wand", "bracer"]
          : ["boots", "magic_wand"],
      objectives: isAggressive
        ? ["Laning", "Early fights", "Tower pressure"]
        : ["Laning", "Last hitting"],
    });

    // Mid game window
    windows.push({
      phase: "mid",
      start: 15,
      end: 35,
      powerLevel: this.calculateMidPower(hero),
      keyItems: ["blink_dagger", "black_king_bar"],
      objectives: ["Team fights", "Objectives"],
    });

    // Late game window
    windows.push({
      phase: "late",
      start: 35,
      end: Math.max(60, expectedDuration),
      powerLevel: this.calculateLatePower(hero),
      keyItems: ["luxury_items"],
      objectives: ["High ground", "Ancient"],
    });

    return windows;
  }

  private calculateEarlyPower(hero: Hero): number {
    // Calculate early game strength based on primary attribute and roles
    let power = 0.5;
    if (hero.primary_attr === "str") power += 0.2;
    if (hero.roles?.includes("Support")) power += 0.1;
    if (hero.roles?.includes("Nuker")) power += 0.15;
    return Math.min(1, power);
  }

  private calculateMidPower(hero: Hero): number {
    // Calculate mid game strength based on roles and versatility
    let power = 0.6;
    if (hero.roles?.includes("Initiator")) power += 0.2;
    if (hero.roles?.includes("Nuker")) power += 0.15;
    if (hero.roles?.includes("Pusher")) power += 0.1;
    return Math.min(1, power);
  }

  private calculateLatePower(hero: Hero): number {
    // Calculate late game strength based on scaling roles
    let power = 0.5;
    if (hero.roles?.includes("Carry")) power += 0.3;
    if (hero.primary_attr === "agi") power += 0.15;
    if (hero.roles?.includes("Durable")) power += 0.1;
    return Math.min(1, power);
  }
}

/**
 * Pro Scene Analyzer - Analyzes professional patterns
 */
class ProSceneAnalyzer {
  analyzeProPatterns(hero: Hero): ProPattern {
    return {
      pickOrder: this.calculatePickOrder(hero),
      banPriority: this.calculateBanPriority(hero),
      firstPickRate: this.calculateFirstPickRate(hero),
      situationalPickRate: this.calculateSituationalRate(hero),
      pairings: this.getCommonPairings(hero),
      counters: this.getEffectiveCounters(hero),
    };
  }

  private calculatePickOrder(hero: Hero): number {
    // Simplified calculation based on hero flexibility
    return hero.roles?.length || 1;
  }

  private calculateBanPriority(hero: Hero): number {
    // High priority heroes get banned more
    return Math.min(10, (hero.roles?.length || 1) * 2);
  }

  private calculateFirstPickRate(hero: Hero): number {
    // Safe first pick heroes
    return hero.roles?.includes("Support") ? 0.3 : 0.1;
  }

  private calculateSituationalRate(hero: Hero): number {
    // Calculate based on hero complexity and niche usage
    let rate = 0.4;

    // More roles = more situational flexibility
    rate += (hero.roles?.length || 1) * 0.1;

    // Complexity heroes are more situational
    const complexHeroes = ["invoker", "meepo", "chen", "visage"];
    if (complexHeroes.includes(hero.name)) rate += 0.2;

    return Math.min(0.9, rate);
  }

  private getCommonPairings(hero: Hero): { heroId: number; synergy: number }[] {
    // Common pairings based on hero roles and attributes
    const pairings: { heroId: number; synergy: number }[] = [];

    // Simplified pairing logic
    if (hero.roles?.includes("Carry")) {
      // Carries pair well with supports
      pairings.push({ heroId: 1, synergy: 0.8 }); // Crystal Maiden
      pairings.push({ heroId: 2, synergy: 0.7 }); // Dazzle
    }

    if (hero.roles?.includes("Support")) {
      // Supports pair well with cores
      pairings.push({ heroId: 3, synergy: 0.8 }); // Anti-Mage
      pairings.push({ heroId: 4, synergy: 0.7 }); // Pudge
    }

    return pairings;
  }

  private getEffectiveCounters(
    hero: Hero
  ): { heroId: number; effectiveness: number }[] {
    // Effective counters based on hero weaknesses
    const counters: { heroId: number; effectiveness: number }[] = [];

    // Simplified counter logic
    if (hero.attack_type === "Melee") {
      // Melee heroes countered by ranged
      counters.push({ heroId: 5, effectiveness: 0.7 }); // Sniper
      counters.push({ heroId: 6, effectiveness: 0.6 }); // Drow Ranger
    }

    if (hero.roles?.includes("Carry")) {
      // Carries countered by disablers
      counters.push({ heroId: 7, effectiveness: 0.8 }); // Shadow Shaman
      counters.push({ heroId: 8, effectiveness: 0.7 }); // Lion
    }

    return counters;
  }
}

/**
 * Advanced Draft Analyzer - Main class
 */
export class AdvancedDraftAnalyzer {
  private mlPredictor = new MLSynergyPredictor();
  private itemAnalyzer = new ItemBuildAnalyzer();
  private laneOptimizer = new LaneOptimizer();
  private timingAnalyzer = new TimingAnalyzer();
  private proAnalyzer = new ProSceneAnalyzer();

  constructor(private heroes: Hero[], private heroStats: HeroStats[]) {}

  generateAdvancedSuggestions(
    draftState: DraftState,
    gameContext: GameContext = {},
    roleFilter?: Role[]
  ): AdvancedSuggestion[] {
    const availableHeroes = this.heroes.filter(
      (hero) =>
        !draftState.yourTeam.some((h: Hero | null) => h?.id === hero.id) &&
        !draftState.enemyTeam.some((h: Hero | null) => h?.id === hero.id) &&
        (!roleFilter ||
          roleFilter.length === 0 ||
          this.matchesRoleFilter(hero, roleFilter))
    );

    const suggestions: AdvancedSuggestion[] = availableHeroes.map((hero) => {
      const breakdown = this.calculateAdvancedScore(
        hero,
        draftState,
        gameContext
      );
      const totalScore = this.calculateTotalScore(breakdown);

      return {
        hero,
        score: totalScore,
        reasons: this.generateReasons(hero, breakdown),
        breakdown,
        itemSynergy: this.itemAnalyzer.generateItemBuilds(hero, gameContext),
        laneOptimization: this.laneOptimizer.optimizeLanes([
          ...(draftState.yourTeam.filter((h: Hero | null) => h) as Hero[]),
          hero,
        ]),
        timingWindows: this.timingAnalyzer.analyzeTimingWindows(
          hero,
          gameContext
        ),
        proPatterns: this.proAnalyzer.analyzeProPatterns(hero),
      };
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  analyzeHero(hero: Hero, gameContext: GameContext = {}): AdvancedHeroAnalysis {
    return {
      hero,
      itemBuilds: this.itemAnalyzer.generateItemBuilds(hero, gameContext),
      laneFlexibility: this.laneOptimizer.optimizeLanes([hero]),
      timingWindows: this.timingAnalyzer.analyzeTimingWindows(
        hero,
        gameContext
      ),
      proPatterns: this.proAnalyzer.analyzeProPatterns(hero),
      mlSynergyScore: this.mlPredictor.predictTeamSynergy([hero]),
      contextualFactors: {
        patchTrend: this.calculatePatchTrend(hero),
        metaPosition: this.calculateMetaPosition(hero),
        adaptability: this.calculateAdaptability(hero),
      },
    };
  }

  private calculateAdvancedScore(
    hero: Hero,
    draftState: DraftState,
    gameContext: GameContext
  ): ScoreBreakdown {
    const yourTeam = draftState.yourTeam.filter(
      (h: Hero | null): h is Hero => h !== null
    );
    const enemyTeam = draftState.enemyTeam.filter(
      (h: Hero | null): h is Hero => h !== null
    );

    return {
      meta: this.calculateMetaScore(hero),
      counter: this.calculateCounterScore(hero, enemyTeam),
      synergy: this.calculateSynergyScore(hero, yourTeam),
      itemSynergy: this.itemAnalyzer.calculateItemSynergy(hero, yourTeam),
      laneOptimization: this.calculateLaneOptimizationScore(hero, yourTeam),
      timing: this.calculateTimingScore(hero, gameContext),
      proPattern: this.calculateProPatternScore(hero),
      mlSynergy: this.mlPredictor.predictTeamSynergy([...yourTeam, hero]),
    };
  }

  private calculateTotalScore(breakdown: ScoreBreakdown): number {
    const weights = {
      meta: 0.15,
      counter: 0.2,
      synergy: 0.2,
      itemSynergy: 0.15,
      laneOptimization: 0.1,
      timing: 0.1,
      proPattern: 0.05,
      mlSynergy: 0.05,
    };

    return Object.entries(breakdown).reduce((total, [key, value]) => {
      return total + value * weights[key as keyof typeof weights];
    }, 0);
  }

  private generateReasons(hero: Hero, breakdown: ScoreBreakdown): string[] {
    const reasons = [];

    if (breakdown.counter > 0.7) reasons.push("Strong counter to enemy heroes");
    if (breakdown.synergy > 0.7) reasons.push("Excellent synergy with team");
    if (breakdown.itemSynergy > 0.7)
      reasons.push("Great item synergy potential");
    if (breakdown.timing > 0.7) reasons.push("Perfect timing window");
    if (breakdown.meta > 0.7) reasons.push("Currently meta");

    return reasons;
  }

  private matchesRoleFilter(hero: Hero, roleFilter: Role[]): boolean {
    return (
      hero.roles?.some((role: string) => roleFilter.includes(role as Role)) ||
      false
    );
  }

  private calculateMetaScore(hero: Hero): number {
    // Simplified meta calculation
    const metaHeroes = ["pudge", "invoker", "phantom_assassin", "sniper"];
    return metaHeroes.includes(hero.name) ? 0.8 : 0.5;
  }

  private calculateCounterScore(hero: Hero, enemyTeam: Hero[]): number {
    if (enemyTeam.length === 0) return 0.5;

    let counterScore = 0;
    enemyTeam.forEach((enemy) => {
      // Simplified counter logic
      if (hero.attack_type === "Ranged" && enemy.attack_type === "Melee") {
        counterScore += 0.1;
      }
    });

    return Math.min(1, counterScore + 0.5);
  }

  private calculateSynergyScore(hero: Hero, yourTeam: Hero[]): number {
    if (yourTeam.length === 0) return 0.5;

    return this.mlPredictor.predictTeamSynergy([...yourTeam, hero]);
  }

  private calculateLaneOptimizationScore(hero: Hero, yourTeam: Hero[]): number {
    const assignments = this.laneOptimizer.optimizeLanes([...yourTeam, hero]);
    const heroAssignment = assignments.find((a) => a.hero.id === hero.id);
    return heroAssignment?.confidence || 0.5;
  }

  private calculateTimingScore(hero: Hero, gameContext: GameContext): number {
    const windows = this.timingAnalyzer.analyzeTimingWindows(hero, gameContext);
    const avgPower =
      windows.reduce((sum, w) => sum + w.powerLevel, 0) / windows.length;
    return avgPower;
  }

  private calculateProPatternScore(hero: Hero): number {
    const patterns = this.proAnalyzer.analyzeProPatterns(hero);
    return (patterns.firstPickRate + patterns.situationalPickRate) / 2;
  }

  private calculatePatchTrend(hero: Hero): number {
    // Calculate patch trend based on hero characteristics
    let trend = 0.5;

    // Popular heroes have positive trend
    const popularHeroes = ["pudge", "invoker", "phantom_assassin"];
    if (popularHeroes.includes(hero.name)) trend += 0.2;

    // New/reworked heroes trend up
    const recentlyUpdated = ["dawnbreaker", "marci", "primal_beast"];
    if (recentlyUpdated.includes(hero.name)) trend += 0.3;

    return Math.min(1, trend);
  }

  private calculateMetaPosition(hero: Hero): number {
    // Calculate meta position based on win rate and pick rate estimation
    let position = 0.5;

    // Strong meta heroes
    const metaHeroes = ["pudge", "sniper", "phantom_assassin", "invoker"];
    if (metaHeroes.includes(hero.name)) position += 0.3;

    // Role popularity affects position
    if (hero.roles?.includes("Carry")) position += 0.1;
    if (hero.roles?.includes("Support")) position += 0.05;

    return Math.min(1, position);
  }

  private calculateAdaptability(hero: Hero): number {
    // Calculate how adaptable the hero is to different situations
    return (hero.roles?.length || 1) / 5;
  }
}

// Export singleton instance
export const advancedAnalyzer = new AdvancedDraftAnalyzer([], []);
