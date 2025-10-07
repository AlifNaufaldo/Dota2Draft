/**
 * Integration layer for Advanced Draft Analyzer
 * Connects the advanced analyzer with the existing draft system
 */

import {
  AdvancedDraftAnalyzer,
  GameContext,
  AdvancedSuggestion,
  AdvancedHeroAnalysis,
} from "./advanced-draft-analyzer";
import { Hero, HeroStats, DraftState, Role } from "./types";

export class DraftAnalyzerIntegration {
  private advancedAnalyzer: AdvancedDraftAnalyzer;

  constructor(heroes: Hero[], heroStats: HeroStats[]) {
    this.advancedAnalyzer = new AdvancedDraftAnalyzer(heroes, heroStats);
  }

  /**
   * Get enhanced recommendations with all advanced features
   */
  async getEnhancedRecommendations(
    draftState: DraftState,
    options: {
      gameContext?: GameContext;
      roleFilter?: Role[];
      includeItemBuilds?: boolean;
      includeLaneOptimization?: boolean;
      includeTimingAnalysis?: boolean;
      includeProPatterns?: boolean;
    } = {}
  ): Promise<AdvancedSuggestion[]> {
    const {
      gameContext = {},
      roleFilter,
      includeItemBuilds = true,
      includeLaneOptimization = true,
      includeTimingAnalysis = true,
      includeProPatterns = true,
    } = options;

    try {
      const suggestions = this.advancedAnalyzer.generateAdvancedSuggestions(
        draftState,
        gameContext,
        roleFilter
      );

      // Filter out components based on options
      return suggestions.map((suggestion) => ({
        ...suggestion,
        itemSynergy: includeItemBuilds ? suggestion.itemSynergy : [],
        laneOptimization: includeLaneOptimization
          ? suggestion.laneOptimization
          : [],
        timingWindows: includeTimingAnalysis ? suggestion.timingWindows : [],
        proPatterns: includeProPatterns
          ? suggestion.proPatterns
          : {
              pickOrder: 0,
              banPriority: 0,
              firstPickRate: 0,
              situationalPickRate: 0,
              pairings: [],
              counters: [],
            },
      }));
    } catch (error) {
      console.error("Error generating enhanced recommendations:", error);
      return [];
    }
  }

  /**
   * Analyze a specific hero with all advanced features
   */
  async analyzeHeroInDepth(
    hero: Hero,
    gameContext: GameContext = {}
  ): Promise<AdvancedHeroAnalysis | null> {
    try {
      return this.advancedAnalyzer.analyzeHero(hero, gameContext);
    } catch (error) {
      console.error("Error analyzing hero:", error);
      return null;
    }
  }

  /**
   * Get quick recommendations for specific scenarios
   */
  async getScenarioRecommendations(
    draftState: DraftState,
    scenario:
      | "early_game"
      | "late_game"
      | "team_fight"
      | "push_strategy"
      | "defensive"
  ): Promise<AdvancedSuggestion[]> {
    const gameContext: GameContext = this.getContextForScenario(scenario);

    return this.getEnhancedRecommendations(draftState, {
      gameContext,
      includeItemBuilds: true,
      includeLaneOptimization: true,
      includeTimingAnalysis: true,
      includeProPatterns: false, // Skip pro patterns for quick scenarios
    });
  }

  /**
   * Get counter-pick recommendations
   */
  async getCounterPickRecommendations(
    draftState: DraftState,
    targetEnemyHero: Hero
  ): Promise<AdvancedSuggestion[]> {
    const suggestions = await this.getEnhancedRecommendations(draftState, {
      includeProPatterns: true,
    });

    // Filter and sort by counter effectiveness against the target enemy hero
    return suggestions
      .filter((suggestion) => {
        // Check if this hero is a good counter to the target enemy
        const isGoodCounter = suggestion.breakdown.counter > 0.6;
        const hasCounterReason = suggestion.reasons.some((reason) =>
          reason.toLowerCase().includes("counter")
        );

        // Consider the target enemy hero for better counter recommendations
        const targetEnemyName = targetEnemyHero.localized_name.toLowerCase();
        const mentionsTarget = suggestion.reasons.some(
          (reason) =>
            reason.toLowerCase().includes(targetEnemyName) ||
            reason.toLowerCase().includes("effective vs")
        );

        return isGoodCounter || hasCounterReason || mentionsTarget;
      })
      .sort((a, b) => b.breakdown.counter - a.breakdown.counter)
      .slice(0, 5);
  }

  /**
   * Get synergy-focused recommendations
   */
  async getSynergyRecommendations(
    draftState: DraftState,
    focusHero?: Hero
  ): Promise<AdvancedSuggestion[]> {
    const suggestions = await this.getEnhancedRecommendations(draftState, {
      includeItemBuilds: true,
      includeLaneOptimization: true,
    });

    // Filter and sort by synergy scores
    return suggestions
      .filter((suggestion) => {
        const hasSynergy =
          suggestion.breakdown.synergy > 0.6 ||
          suggestion.breakdown.mlSynergy > 0.6 ||
          suggestion.breakdown.itemSynergy > 0.6;

        // If focusHero is provided, prioritize heroes that synergize with it
        if (focusHero) {
          const focusedSynergy = suggestion.reasons.some((reason) =>
            reason.toLowerCase().includes("synerg")
          );
          return hasSynergy || focusedSynergy;
        }

        return hasSynergy;
      })
      .sort((a, b) => {
        const aTotal =
          a.breakdown.synergy + a.breakdown.mlSynergy + a.breakdown.itemSynergy;
        const bTotal =
          b.breakdown.synergy + b.breakdown.mlSynergy + b.breakdown.itemSynergy;
        return bTotal - aTotal;
      })
      .slice(0, 5);
  }

  /**
   * Get lane-specific recommendations
   */
  async getLaneRecommendations(
    draftState: DraftState,
    lane: 1 | 2 | 3 | 4 | 5
  ): Promise<AdvancedSuggestion[]> {
    const suggestions = await this.getEnhancedRecommendations(draftState, {
      includeLaneOptimization: true,
      includeTimingAnalysis: true,
    });

    // Filter heroes that are good for the specified lane
    return suggestions
      .filter((suggestion) => {
        const laneAssignment = suggestion.laneOptimization.find(
          (assignment) => assignment.hero.id === suggestion.hero.id
        );
        return (
          laneAssignment?.position === lane && laneAssignment.confidence > 0.6
        );
      })
      .sort((a, b) => {
        const aConf =
          a.laneOptimization.find((la) => la.hero.id === a.hero.id)
            ?.confidence || 0;
        const bConf =
          b.laneOptimization.find((la) => la.hero.id === b.hero.id)
            ?.confidence || 0;
        return bConf - aConf;
      })
      .slice(0, 5);
  }

  /**
   * Get timing-based recommendations
   */
  async getTimingRecommendations(
    draftState: DraftState,
    targetPhase: "early" | "mid" | "late"
  ): Promise<AdvancedSuggestion[]> {
    const gameContext: GameContext = {
      expectedDuration:
        targetPhase === "early" ? 25 : targetPhase === "mid" ? 40 : 60,
      playstyle: targetPhase === "early" ? "aggressive" : "balanced",
      itemStrategy:
        targetPhase === "early"
          ? "early"
          : targetPhase === "late"
          ? "scaling"
          : "utility",
    };

    const suggestions = await this.getEnhancedRecommendations(draftState, {
      gameContext,
      includeTimingAnalysis: true,
      includeItemBuilds: true,
    });

    // Filter by timing window strength
    return suggestions
      .filter((suggestion) => {
        const targetWindow = suggestion.timingWindows.find(
          (window) => window.phase === targetPhase
        );
        return targetWindow && targetWindow.powerLevel > 0.6;
      })
      .sort((a, b) => {
        const aWindow = a.timingWindows.find((w) => w.phase === targetPhase);
        const bWindow = b.timingWindows.find((w) => w.phase === targetPhase);
        return (bWindow?.powerLevel || 0) - (aWindow?.powerLevel || 0);
      })
      .slice(0, 5);
  }

  private getContextForScenario(scenario: string): GameContext {
    switch (scenario) {
      case "early_game":
        return {
          expectedDuration: 25,
          playstyle: "aggressive",
          itemStrategy: "early",
        };
      case "late_game":
        return {
          expectedDuration: 60,
          playstyle: "defensive",
          itemStrategy: "scaling",
        };
      case "team_fight":
        return {
          expectedDuration: 40,
          playstyle: "aggressive",
          itemStrategy: "utility",
        };
      case "push_strategy":
        return {
          expectedDuration: 35,
          playstyle: "aggressive",
          itemStrategy: "early",
        };
      case "defensive":
        return {
          expectedDuration: 50,
          playstyle: "defensive",
          itemStrategy: "utility",
        };
      default:
        return {};
    }
  }
}

// Utility functions for UI integration
export const formatScoreBreakdown = (breakdown: {
  meta: number;
  counter: number;
  synergy: number;
  itemSynergy: number;
  laneOptimization: number;
  timing: number;
  proPattern: number;
  mlSynergy: number;
}) => {
  return {
    "Meta Score": Math.round(breakdown.meta * 100),
    "Counter Score": Math.round(breakdown.counter * 100),
    "Synergy Score": Math.round(breakdown.synergy * 100),
    "Item Synergy": Math.round(breakdown.itemSynergy * 100),
    "Lane Optimization": Math.round(breakdown.laneOptimization * 100),
    "Timing Score": Math.round(breakdown.timing * 100),
    "Pro Pattern": Math.round(breakdown.proPattern * 100),
    "ML Synergy": Math.round(breakdown.mlSynergy * 100),
  };
};

export const formatTimingWindows = (
  windows: {
    phase: string;
    start: number;
    end: number;
    powerLevel: number;
    keyItems: string[];
    objectives: string[];
  }[]
) => {
  return windows.map((window) => ({
    phase: window.phase.charAt(0).toUpperCase() + window.phase.slice(1),
    timing: `${window.start}-${window.end} min`,
    strength: Math.round(window.powerLevel * 100),
    keyItems: window.keyItems.join(", "),
    objectives: window.objectives.join(", "),
  }));
};

export const formatLaneAssignments = (
  assignments: {
    position: 1 | 2 | 3 | 4 | 5;
    hero: { localized_name: string };
    confidence: number;
    reasoning: string[];
  }[]
) => {
  const positionNames = {
    1: "Carry",
    2: "Mid",
    3: "Offlane",
    4: "Soft Support",
    5: "Hard Support",
  };

  return assignments.map((assignment) => ({
    position: positionNames[assignment.position as keyof typeof positionNames],
    hero: assignment.hero.localized_name,
    confidence: Math.round(assignment.confidence * 100),
    reasoning: assignment.reasoning.join(", "),
  }));
};
