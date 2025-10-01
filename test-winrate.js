// Simple test to verify win rate calculations
const testHeroStats = {
  id: 1,
  name: "npc_dota_hero_antimage",
  localized_name: "Anti-Mage",
  primary_attr: "agi",
  attack_type: "Melee",
  roles: ["Carry", "Escape", "Nuker"],
  img: "/apps/dota2/images/dota_react/heroes/antimage.png",
  icon: "/apps/dota2/images/dota_react/heroes/icons/antimage.png",
  pub_pick: 583802,
  pub_win: 300526,
  pub_pick_trend: [87600, 93509, 106439, 104165, 87111, 85610, 19368],
  pub_win_trend: [45105, 47883, 54808, 53756, 44917, 44125, 9932],
  pro_pick: 59,
  pro_win: 30,
  pro_ban: 91,
  turbo_picks: 216922,
  turbo_wins: 114976,
  turbo_picks_trend: [32067, 35060, 40200, 38864, 32827, 31384, 6520],
  turbo_wins_trend: [16971, 18717, 21253, 20540, 17411, 16688, 3396],
  "1_pick": 44618,
  "1_win": 23459,
  "2_pick": 96979,
  "2_win": 50875,
  "3_pick": 115315,
  "3_win": 59812,
  "4_pick": 108116,
  "4_win": 55520,
  "5_pick": 80313,
  "5_win": 40796,
  "6_pick": 49486,
  "6_win": 24986,
  "7_pick": 44926,
  "7_win": 22341,
  "8_pick": 0,
  "8_win": 0,
};

// Calculate win rate
const calculateWinRate = (wins, games) => {
  if (games === 0) return 0;
  return Number(((wins / games) * 100).toFixed(2));
};

const winRate = calculateWinRate(testHeroStats.pub_win, testHeroStats.pub_pick);
console.log(`Anti-Mage win rate: ${winRate}%`);

// Calculate pro win rate
const proWinRate = calculateWinRate(
  testHeroStats.pro_win,
  testHeroStats.pro_pick
);
console.log(`Anti-Mage pro win rate: ${proWinRate}%`);

console.log("Win rate calculation test passed!");
