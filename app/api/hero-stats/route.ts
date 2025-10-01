import { NextResponse } from "next/server";
import { OpenDotaAPI } from "@/lib/opendota";

export async function GET() {
  try {
    const heroStats = await OpenDotaAPI.getHeroStats();

    // Cache for 30 minutes since stats update more frequently
    return NextResponse.json(heroStats, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("API Error - Hero Stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero statistics" },
      { status: 500 }
    );
  }
}
