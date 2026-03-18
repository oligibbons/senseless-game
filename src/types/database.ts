export type GameStatus = 'lobby' | 'writing' | 'voting' | 'resolution' | 'tie_breaker';
export type Category = 'Location' | 'Object' | 'Famous Person';
export type Sense = 'Sight' | 'Sound' | 'Smell' | 'Touch' | 'Taste';

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
  voted_for: string | null; // Added this to match your database schema and actions
}