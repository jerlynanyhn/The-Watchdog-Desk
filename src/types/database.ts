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
  last_life_lost_at: string | null;
  created_at?: string;
}