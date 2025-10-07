import { NextRequest, NextResponse } from "next/server";
import { OpenDotaAPI } from "@/lib/opendota";
import { DraftAnalyzer } from "@/lib/draft-logic";
import { DataTransformer } from "@/lib/data-transformer";
import { Hero, DraftState, Role } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      draftState,
      roleFilter,
      gameContext,
      useAdvanced = true
    }: {
      draftState: DraftState;
      roleFilter?: Role[];
      gameContext?: {
        expectedDuration?: number;
        preferredLanes?: number[];
        playstyle?: "aggressive" | "defensive" | "balanced";
        itemStrategy?: "early" | "scaling" | "utility";
      };
      useAdvanced?: boolean;
    } = body;

    // Validate request body
    if (!draftState || !draftState.yourTeam || !draftState.enemyTeam) {
      return NextResponse.json(
        { error: "Invalid draft state provided" },
        { status: 400 }
      );
    }

    // Fetch heroes and stats
    const [heroes, heroStats] = await Promise.all([
      OpenDotaAPI.getHeroes(),
      OpenDotaAPI.getHeroStats(),
    ]);

    // Initialize draft analyzer
    const analyzer = new DraftAnalyzer(heroes, heroStats);

    // Get matchup data for enemy heroes
    const enemyHeroes = draftState.enemyTeam.filter(
      (h) => h !== null
    ) as Hero[];

    // Fetch matchup data for enemy heroes with enhanced error handling
    const matchupPromises = enemyHeroes.map(async (enemy) => {
      try {
        const matchups = await OpenDotaAPI.getHeroMatchups(enemy.id);
        return { heroId: enemy.id, matchups };
      } catch (error) {
        // Enhanced error logging with more context
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `⚠️ Failed to fetch matchups for hero ${enemy.id} (${
            enemy.localized_name || "Unknown"
          }):`,
          {
            message: errorMessage,
            heroName: enemy.localized_name || "Unknown",
            endpoint: `/heroes/${enemy.id}/matchups`,
          }
        );

        // Return empty matchups but keep the request going
        return { heroId: enemy.id, matchups: [] };
      }
    });

    const matchupResults = await Promise.all(matchupPromises);

    // Set matchup data in analyzer
    matchupResults.forEach(({ heroId, matchups }) => {
      const transformedMatchups =
        DataTransformer.transformMatchupData(matchups);
      analyzer.setMatchupData(heroId, transformedMatchups);
    });

    // Generate suggestions - use advanced method if requested
    const suggestions = useAdvanced 
      ? await analyzer.generateAdvancedSuggestions(
          draftState,
          gameContext || {},
          roleFilter,
          15
        )
      : analyzer.generateSuggestions(
          draftState,
          roleFilter,
          15
        );

    // Debug logging
    console.log(`Generated ${suggestions.length} suggestions for draft:`, {
      yourTeamCount: draftState.yourTeam.filter(h => h !== null).length,
      enemyTeamCount: draftState.enemyTeam.filter(h => h !== null).length,
      useAdvanced,
      roleFilter,
      totalHeroes: heroes.length,
      totalStats: heroStats.length
    });

    // Cache for 5 minutes since this is dynamic data
    return NextResponse.json(suggestions, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("API Error - Suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate draft suggestions" },
      { status: 500 }
    );
  }
}
