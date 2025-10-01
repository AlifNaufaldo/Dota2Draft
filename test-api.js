/**
 * Simple API test script to verify endpoints are working
 * Run with: node test-api.js
 */

const API_BASE = "http://localhost:3000/api";

async function testAPI() {
  console.log("🧪 Testing Dota 2 Draft Analyzer API...\n");

  // Test 1: Heroes endpoint
  try {
    console.log("1. Testing /api/heroes...");
    const heroesResponse = await fetch(`${API_BASE}/heroes`);

    if (!heroesResponse.ok) {
      throw new Error(
        `HTTP ${heroesResponse.status}: ${heroesResponse.statusText}`
      );
    }

    const heroes = await heroesResponse.json();
    console.log(`✅ Heroes endpoint working - Found ${heroes.length} heroes`);

    if (heroes.length > 0) {
      const firstHero = heroes[0];
      console.log(
        `   Sample hero: ${firstHero.localized_name} (${firstHero.primary_attr})`
      );
    }
  } catch (error) {
    console.error("❌ Heroes endpoint failed:", error.message);
  }

  console.log("");

  // Test 2: Hero Stats endpoint
  try {
    console.log("2. Testing /api/hero-stats...");
    const statsResponse = await fetch(`${API_BASE}/hero-stats`);

    if (!statsResponse.ok) {
      throw new Error(
        `HTTP ${statsResponse.status}: ${statsResponse.statusText}`
      );
    }

    const stats = await statsResponse.json();
    console.log(
      `✅ Hero stats endpoint working - Found ${stats.length} hero stats`
    );

    if (stats.length > 0) {
      const topHero = stats.sort((a, b) => b.win_rate - a.win_rate)[0];
      console.log(
        `   Highest win rate: Hero ID ${topHero.id} (${topHero.win_rate.toFixed(
          2
        )}%)`
      );
    }
  } catch (error) {
    console.error("❌ Hero stats endpoint failed:", error.message);
  }

  console.log("");

  // Test 3: Suggestions endpoint (with mock data)
  try {
    console.log("3. Testing /api/suggestions...");

    const mockDraftState = {
      yourTeam: [null, null, null, null, null],
      enemyTeam: [
        { id: 1, name: "npc_dota_hero_antimage", localized_name: "Anti-Mage" },
        null,
        null,
        null,
        null,
      ],
      currentPhase: "pick",
      currentPick: 1,
    };

    const suggestionsResponse = await fetch(`${API_BASE}/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draftState: mockDraftState,
        roleFilter: [],
      }),
    });

    if (!suggestionsResponse.ok) {
      throw new Error(
        `HTTP ${suggestionsResponse.status}: ${suggestionsResponse.statusText}`
      );
    }

    const suggestions = await suggestionsResponse.json();
    console.log(
      `✅ Suggestions endpoint working - Found ${suggestions.length} suggestions`
    );

    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      console.log(
        `   Top suggestion: ${topSuggestion.hero.localized_name} (Score: ${topSuggestion.score})`
      );
    }
  } catch (error) {
    console.error("❌ Suggestions endpoint failed:", error.message);
  }

  console.log("\n🏁 API testing completed!");
}

// Run the test
testAPI().catch(console.error);
