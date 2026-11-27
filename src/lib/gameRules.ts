export function calculateRank(totalScore: number): string {
  if (totalScore >= 6500) return 'Editor-in-Chief';
  if (totalScore >= 4500) return 'Managing Editor';
  if (totalScore >= 2500) return 'Copy Desk Chief';
  if (totalScore >= 1000) return 'Junior Copy Editor';
  return 'Proofreader Trainee';
}

const LIFE_REGEN_MS = 10 * 60 * 1000; // 1 life per 10 minutes

// Life regeneration: 1 newspaper life every 10 minutes (max 5).
// newUpdatedAt keeps leftover regen progress instead of resetting to "now".
export function computeCurrentLives(livesCount: number, livesUpdatedAt: string) {
  const now = Date.now();

  if (livesCount >= 5) {
    return {
      currentLives: 5,
      justRefilled: false,
      newUpdatedAt: new Date(now).toISOString(),
    };
  }

  const lastMs = new Date(livesUpdatedAt).getTime();
  const regen = Math.max(0, Math.floor((now - lastMs) / LIFE_REGEN_MS));
  const currentLives = Math.min(5, livesCount + regen);
  const newUpdatedAt =
    currentLives >= 5
      ? new Date(now).toISOString()
      : new Date(lastMs + regen * LIFE_REGEN_MS).toISOString();

  return {
    currentLives,
    justRefilled: currentLives === 5 && livesCount < 5,
    newUpdatedAt,
  };
}

// Round Score Formula
export function calculateRoundScore(params: {
  wordsSolved: number; // out of 6 (+100 each)
  remainingLives: number; // out of 5 (+50 each)
  secondsLeft: number; // out of 120 (+3 each)
  wrongAttempts: number; // -35 each
  hintsUsed: number; // -25 each
  wonDuel: boolean; // +150 bonus
}) {
  const raw =
    params.wordsSolved * 100 +
    params.remainingLives * 50 +
    params.secondsLeft * 3 +
    (params.wonDuel ? 150 : 0) -
    params.wrongAttempts * 35 -
    params.hintsUsed * 25;

  return Math.max(0, raw);
}