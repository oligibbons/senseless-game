// src/types/database.ts

export type GameStatus = 'lobby' | 'writing' | 'voting' | 'resolution' | 'tie_breaker' | 'game_over';
export type Category = 'Location' | 'Object' | 'Famous Person';
export type Sense = 'Sight' | 'Sound' | 'Smell' | 'Touch' | 'Taste';

export interface PlayerStats {
  correct_guesses: number;
  fooled_others: number;
  longest_clue: number;
  shortest_clue: number;
  // --- NEW STATS ---
  wrong_guesses: number;
  innocent_votes_received: number;
  successful_steals: number;
  times_caught: number;
}

export interface Prompt {
  id: string; // UUID
  category: Category;
  true_target: string;
  imposter_target: string;
  true_synonyms: string[]; // JSONB parsed into an array of strings
}

export interface Room {
  room_code: string;
  host_id: string; // UUID
  game_status: GameStatus;
  current_round: number;
  round_settings: {
    mode: 'rounds' | 'score';
    target: number;
  };
  current_prompt_id: string | null; // UUID, null when in lobby
}

export interface Player {
  id: string; // UUID
  room_code: string;
  player_name: string;
  is_imposter: boolean;
  assigned_sense: Sense | null;
  current_clue: string | null; // Max 50 chars enforced on UI
  score: number;
  is_connected: boolean;
  last_seen: string; // TIMESTAMPTZ string
  voted_for: string | null; 
  stats: PlayerStats | null; // Tracks cumulative funny stats
  last_score_delta: number | null; // Tracks points gained/lost in the last round
}