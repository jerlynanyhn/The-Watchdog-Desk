export function calculateRank(totalScore: number): string {
    if (totalScore >= 7500) return 'Editor-in-Chief';
    if (totalScore >= 5500) return 'Copy Desk Chief';
    if (totalScore >= 3500) return 'Copy Editor';
    if (totalScore >= 1500) return 'Cub Reporter';
    return 'Proofreader Trainee';
  }
  
  // Life regeneration: 1 newspaper life every 10 minutes (max 5)
  export function computeCurrentLives(livesCount: number, livesUpdatedAt: string) {
    if (livesCount >= 5) return { currentLives: 5, justRefilled: false };
    const elapsedMs = Date.now() - new Date(livesUpdatedAt).getTime();
    const minsPassed = Math.floor(elapsedMs / 60000);
    const regen = Math.floor(minsPassed / 10);
    const currentLives = Math.min(5, livesCount + regen);
    return {
      currentLives,
      justRefilled: currentLives === 5 && livesCount < 5,
    };
  }
  
  // Round Score Formula
  export function calculateRoundScore(params: {
    wordsSolved: number;      // out of 6 (+100 each)
    remainingLives: number;   // out of 5 (+50 each)
    secondsLeft: number;      // out of 120 (+3 each)
    wrongAttempts: number;    // -35 each
    hintsUsed: number;        // -25 each
    wonDuel: boolean;         // +150 bonus
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