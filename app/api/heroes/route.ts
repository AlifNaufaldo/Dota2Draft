import { NextResponse } from "next/server";
import { OpenDotaAPI } from "@/lib/opendota";

export async function GET() {
  try {
    const heroes = await OpenDotaAPI.getHeroes();

    // Cache for 1 hour since hero data doesn't change often
    return NextResponse.json(heroes, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("API Error - Heroes:", error);
    return NextResponse.json(
      { error: "Failed to fetch heroes" },
      { status: 500 }
    );
  }
}
