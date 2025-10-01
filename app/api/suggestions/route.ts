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
    }: {
      draftState: DraftState;
      roleFilter?: Role[];
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

    // Fetch matchup data for enemy heroes (this could be cached/optimized)
    const matchupPromises = enemyHeroes.map(async (enemy) => {
      try {
        const matchups = await OpenDotaAPI.getHeroMatchups(enemy.id);
        return { heroId: enemy.id, matchups };
      } catch (error) {
        console.warn(`Failed to fetch matchups for hero ${enemy.id}:`, error);
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

    // Generate suggestions
    const suggestions = analyzer.generateSuggestions(
      draftState,
      roleFilter,
      15
    );

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
