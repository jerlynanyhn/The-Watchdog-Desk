export type GenderDesk = 'Male' | 'Female';
export type AvatarCode = 'M1' | 'M2' | 'M3' | 'F1' | 'F2' | 'F3';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string;
  username: string;
  gender: GenderDesk;
  avatar_id: AvatarCode;
  editorial_rank: string;
  total_score: number;
  best_round_score: number;
  lives_count: number;
  lives_updated_at: string;
  last_life_lost_at: string | null;
  unlocked_editions: string[];
  completed_editions: string[];
  duel_wins: number;
  created_at?: string;
}