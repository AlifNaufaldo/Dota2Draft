// Dota 2 Hero Draft Types

export interface Hero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: "agi" | "str" | "int" | "all";
  attack_type: "Melee" | "Ranged";
  roles: string[];
  img: string;
  icon: string;
}

export interface HeroStats {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: "agi" | "str" | "int" | "all";
  attack_type: "Melee" | "Ranged";
  roles: string[];
  img: string;
  icon: string;
  // Public match statistics
  pub_pick: number;
  pub_win: number;
  pub_pick_trend: number[];
  pub_win_trend: number[];
  // Professional match statistics
  pro_pick: number;
  pro_win: number;
  pro_ban: number;
  // Turbo match statistics
  turbo_picks: number;
  turbo_wins: number;
  turbo_picks_trend: number[];
  turbo_wins_trend: number[];
  // Bracket-specific statistics (1=Herald, 2=Guardian, etc.)
  "1_pick": number;
  "1_win": number;
  "2_pick": number;
  "2_win": number;
  "3_pick": number;
  "3_win": number;
  "4_pick": number;
  "4_win": number;
  "5_pick": number;
  "5_win": number;
  "6_pick": number;
  "6_win": number;
  "7_pick": number;
  "7_win": number;
  "8_pick": number;
  "8_win": number;
}

export interface DraftSuggestion {
  hero: Hero;
  score: number;
  win_rate: number;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
  counters: string[];
  synergies: string[];
}

export interface DraftState {
  yourTeam: (Hero | null)[];
  enemyTeam: (Hero | null)[];
  currentPhase: "pick" | "completed";
  currentPick: number; // 0-9 for 10 picks total
}

export type Role =
  | "Carry"
  | "Support"
  | "Initiator"
  | "Disabler"
  | "Jungler"
  | "Durable"
  | "Escape"
  | "Pusher"
  | "Nuker";

export interface OpenDotaMatch {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  start_time: number;
  radiant_team: number[];
  dire_team: number[];
}

export interface HeroMatchup {
  hero_id: number;
  matchup_data: {
    [key: number]: {
      games: number;
      wins: number;
    };
  };
}

export interface ProMatch {
  match_id: number;
  duration: number;
  start_time: number;
  radiant_team_id?: number;
  dire_team_id?: number;
  leagueid: number;
  league_name: string;
  series_id: number;
  series_type: number;
  radiant_score: number;
  dire_score: number;
  radiant_win: boolean;
  radiant_name: string;
  dire_name: string;
}

export interface HeroMatchupData {
  hero_id: number;
  games_played: number;
  wins: number;
}

// OpenDota API response format
export interface OpenDotaMatchupData {
  hero_id: number;
  games: number;
  wins: number;
}
