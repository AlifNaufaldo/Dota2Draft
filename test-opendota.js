/**
 * OpenDota API Connection Test
 * Tests direct connection to OpenDota API
 */

import axios from "axios";

const OPENDOTA_API_BASE = "https://api.opendota.com/api";

async function testOpenDotaAPI() {
  console.log("🌐 Testing OpenDota API Connection...\n");

  // Test 1: Heroes endpoint
  try {
    console.log("1. Testing OpenDota /heroes endpoint...");
    const response = await axios.get(`${OPENDOTA_API_BASE}/heroes`, {
      timeout: 10000,
    });

    console.log(
      `✅ OpenDota heroes endpoint working - Status: ${response.status}`
    );
    console.log(`   Found ${response.data.length} heroes`);

    if (response.data.length > 0) {
      const firstHero = response.data[0];
      console.log(
        `   Sample: ${firstHero.localized_name} (${firstHero.primary_attr})`
      );
    }
  } catch (error) {
    console.error("❌ OpenDota heroes endpoint failed:", error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }

  console.log("");

  // Test 2: Hero Stats endpoint
  try {
    console.log("2. Testing OpenDota /heroStats endpoint...");
    const response = await axios.get(`${OPENDOTA_API_BASE}/heroStats`, {
      timeout: 10000,
    });

    console.log(
      `✅ OpenDota heroStats endpoint working - Status: ${response.status}`
    );
    console.log(`   Found ${response.data.length} hero statistics`);

    if (response.data.length > 0) {
      const topHero = response.data.sort((a, b) => b.win_rate - a.win_rate)[0];
      console.log(
        `   Highest win rate: Hero ID ${topHero.id} (${(
          topHero.win_rate * 100
        ).toFixed(2)}%)`
      );
    }
  } catch (error) {
    console.error("❌ OpenDota heroStats endpoint failed:", error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }

  console.log("");

  // Test 3: Hero matchups (example with hero ID 1 - Anti-Mage)
  try {
    console.log("3. Testing OpenDota hero matchups endpoint...");
    const heroId = 1; // Anti-Mage
    const response = await axios.get(
      `${OPENDOTA_API_BASE}/heroes/${heroId}/matchups`,
      {
        timeout: 10000,
      }
    );

    console.log(
      `✅ OpenDota matchups endpoint working - Status: ${response.status}`
    );
    console.log(
      `   Found ${response.data.length} matchup records for hero ${heroId}`
    );

    if (response.data.length > 0) {
      const bestMatchup = response.data.sort(
        (a, b) => b.wins / b.games - a.wins / a.games
      )[0];
      const winRate = ((bestMatchup.wins / bestMatchup.games) * 100).toFixed(2);
      console.log(
        `   Best matchup: vs Hero ${bestMatchup.hero_id} (${winRate}% in ${bestMatchup.games} games)`
      );
    }
  } catch (error) {
    console.error("❌ OpenDota matchups endpoint failed:", error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
  }

  console.log("");

  // Test 4: Rate limiting check
  console.log("4. Testing rate limiting (making 3 quick requests)...");
  try {
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        axios.get(`${OPENDOTA_API_BASE}/heroes`, { timeout: 5000 })
      );
    }

    const results = await Promise.all(promises);
    console.log(
      `✅ Rate limiting test passed - All ${results.length} requests succeeded`
    );
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log(
        "⚠️  Rate limiting detected (429 Too Many Requests) - This is expected"
      );
    } else {
      console.error("❌ Rate limiting test failed:", error.message);
    }
  }

  console.log("\n🏁 OpenDota API testing completed!");
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOpenDotaAPI().catch(console.error);
}

export { testOpenDotaAPI };
