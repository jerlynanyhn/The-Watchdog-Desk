'use client';

import { use, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Newspaper,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateRank, calculateRoundScore, computeCurrentLives } from '@/lib/gameRules';
import editionsData from '@/data/editions.json';

interface WordMeta {
  wordId: string;
  answer: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  synonyms: string[];
  example: string;
  wrongFeedback: string;
  typo?: string;
  options?: string[];
  clue?: string;
}

interface ParagraphStep {
  step: number;
  type: 'context' | 'spelling' | 'typein';
  instruction: string;
  segments: string[];
  blanks?: WordMeta[];
  targets?: WordMeta[];
  trayOptions?: string[];
}

interface EditionEntry {
  id: string;
  category: string;
  editionNumber: string;
  nextEditionId: string | null;
  headline: string;
  paragraphs: ParagraphStep[];
}

const EDITIONS = editionsData as Record<string, EditionEntry>;
const ROUND_DURATION_SECONDS = 120;
const DEFAULT_UNLOCKED = ['editorial-01', 'feature-01', 'entertainment-01'];
const MAX_DUEL_BONUSES_PER_RIVAL = 3;

export default function PlayEditionPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const edition = EDITIONS[editionId];

  // Optional 1v1 Ghost Duel params from /leaderboard (display only; real values are re-read from DB)
  const duelId = searchParams.get('duelId');
  const duelTargetScore = Number(searchParams.get('targetScore') || 0);
  const duelRival = searchParams.get('rival') || '';

  const [userId, setUserId] = useState<string>('');
  const [alreadyCompleted, setAlreadyCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [lives, setLives] = useState<number>(5);
  const [livesClock, setLivesClock] = useState<string>(new Date().toISOString());
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_DURATION_SECONDS);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Step 1 (Context Tap-Tray)
  const [step1Answers, setStep1Answers] = useState<string[]>(['', '']);
  const [activeBlankIdx, setActiveBlankIdx] = useState<number>(0);

  // Step 2 (Spelling Proofreader)
  const [step2Answers, setStep2Answers] = useState<string[]>(['', '']);
  const [openTargetIdx, setOpenTargetIdx] = useState<number | null>(0);

  // Step 3 (Active Recall Type-In)
  const [step3Inputs, setStep3Inputs] = useState<string[]>(['', '']);

  const hasLives = lives > 0;

  useEffect(() => {
    let active = true;

    async function initCopyDesk() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('lives_count, lives_updated_at, completed_editions, unlocked_editions')
        .eq('id', user.id)
        .single();

      if (!active) return;

      if (profile) {
        // Block locked editions (typing the URL directly)
        const unlocked: string[] = Array.isArray(profile.unlocked_editions)
          ? profile.unlocked_editions
          : DEFAULT_UNLOCKED;
        if (!unlocked.includes(editionId)) {
          router.replace('/newsroom');
          return;
        }

        const synced = computeCurrentLives(
          profile.lives_count ?? 5,
          profile.lives_updated_at
        );
        setLives(synced.currentLives);
        setLivesClock(synced.newUpdatedAt);

        const completedList: string[] = Array.isArray(profile.completed_editions)
          ? profile.completed_editions
          : [];
        setAlreadyCompleted(completedList.includes(editionId));

        if (synced.currentLives !== profile.lives_count) {
          await supabase
            .from('profiles')
            .update({
              lives_count: synced.currentLives,
              lives_updated_at: synced.newUpdatedAt,
            })
            .eq('id', user.id);
        }
      }

      setUserId(user.id);
      setLoading(false);
    }

    initCopyDesk();
    return () => {
      active = false;
    };
  }, [router, editionId]);

  // Countdown. A missed deadline costs NO life (rule), so nothing else happens at 0.
  useEffect(() => {
    if (loading || !edition || !hasLives || submitting) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading, edition, hasLives, submitting]);

  const currentParagraph = edition?.paragraphs[currentStepIndex];

  const allEditionWords = useMemo(() => {
    if (!edition) return [];
    const words: WordMeta[] = [];
    for (const p of edition.paragraphs) {
      if (p.blanks) words.push(...p.blanks);
      if (p.targets) words.push(...p.targets);
    }
    return words;
  }, [edition]);

  async function penalizeMistake(message: string) {
    setMistakes((m) => m + 1);
    setFeedback({ type: 'error', text: message });

    const nextLives = Math.max(0, lives - 1);
    // Regen clock only starts when dropping from full; otherwise keep earned progress.
    const nextClock = lives >= 5 ? new Date().toISOString() : livesClock;
    setLives(nextLives);
    setLivesClock(nextClock);

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          lives_count: nextLives,
          lives_updated_at: nextClock,
        })
        .eq('id', userId);
      if (error) console.error('Life update error:', error.message);
    }
  }

  function handleSelectToken(token: string) {
    if (!currentParagraph || currentParagraph.type !== 'context') return;
    setFeedback(null);

    const updated = [...step1Answers];
    updated[activeBlankIdx] = token;
    setStep1Answers(updated);

    const nextEmpty = updated.findIndex((val) => !val);
    if (nextEmpty !== -1) {
      setActiveBlankIdx(nextEmpty);
    }
  }

  async function verifyStep1() {
    if (!currentParagraph?.blanks) return;
    const blanks = currentParagraph.blanks;

    for (let i = 0; i < blanks.length; i++) {
      if (!step1Answers[i]) {
        setFeedback({ type: 'error', text: `Fill Blank #${i + 1} before verifying Paragraph 1.` });
        return;
      }
      if (step1Answers[i].toUpperCase() !== blanks[i].answer.toUpperCase()) {
        await penalizeMistake(blanks[i].wrongFeedback);
        return;
      }
    }

    setFeedback({ type: 'success', text: 'Paragraph 1 cleared! Advancing to Paragraph 2...' });
    window.setTimeout(() => {
      setFeedback(null);
      setCurrentStepIndex(1);
    }, 650);
  }

  function handleSelectSpelling(targetIdx: number, choice: string) {
    setFeedback(null);
    const updated = [...step2Answers];
    updated[targetIdx] = choice;
    setStep2Answers(updated);
    setOpenTargetIdx(targetIdx === 0 ? 1 : null);
  }

  async function verifyStep2() {
    if (!currentParagraph?.targets) return;
    const targets = currentParagraph.targets;

    for (let i = 0; i < targets.length; i++) {
      if (!step2Answers[i]) {
        setFeedback({
          type: 'error',
          text: `Click highlighted typo #${i + 1} and choose the right spelling.`,
        });
        return;
      }
      if (step2Answers[i].toUpperCase() !== targets[i].answer.toUpperCase()) {
        await penalizeMistake(targets[i].wrongFeedback);
        return;
      }
    }

    setFeedback({ type: 'success', text: 'Paragraph 2 proofread! Advancing to Final Paragraph...' });
    window.setTimeout(() => {
      setFeedback(null);
      setCurrentStepIndex(2);
    }, 650);
  }

  async function verifyStep3AndPublish(e: FormEvent) {
    e.preventDefault();
    if (!currentParagraph?.blanks || submitting) return;
    const blanks = currentParagraph.blanks;

    for (let i = 0; i < blanks.length; i++) {
      const typed = step3Inputs[i].trim().toUpperCase();
      if (!typed) {
        setFeedback({ type: 'error', text: `Type the missing word for Blank #${i + 1}.` });
        return;
      }
      if (typed !== blanks[i].answer.toUpperCase()) {
        await penalizeMistake(blanks[i].wrongFeedback);
        return;
      }
    }

    setSubmitting(true);

    const rawRoundScore = calculateRoundScore({
      wordsSolved: allEditionWords.length,
      remainingLives: lives,
      secondsLeft: timeLeft,
      wrongAttempts: mistakes,
      hintsUsed: 0,
      wonDuel: false,
    });

    // 1. Fetch current profile stats
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('total_score, best_round_score, unlocked_editions, completed_editions, duel_wins')
      .eq('id', userId)
      .single();

    if (fetchErr) {
      console.error('Profile fetch error:', fetchErr.message);
    }

    const prevCompleted: string[] = Array.isArray(profile?.completed_editions)
      ? profile.completed_editions
      : [];
    const isRepeat = prevCompleted.includes(edition.id);

    // Anti-farming: 0 edition points if this edition was already completed
    const editionPointsEarned = isRepeat ? 0 : rawRoundScore;

    // 2. Resolve 1v1 Ghost Duel if active (all values re-read from the database)
    let duelBonus = 0;
    let duelOutcome = 'none'; // 'none' | 'won' | 'lost'
    let duelTarget = 0;

    if (duelId) {
      const { data: duelRecord } = await supabase
        .from('press_duels')
        .select('id, status, challenger_id, opponent_id, edition_id, target_score')
        .eq('id', duelId)
        .single();

      const validDuel =
        duelRecord &&
        duelRecord.status === 'pending' &&
        duelRecord.challenger_id === userId &&
        duelRecord.edition_id === edition.id;

      if (validDuel && duelRecord) {
        duelTarget = duelRecord.target_score;

        const { data: priorWins } = await supabase
          .from('press_duels')
          .select('edition_id')
          .eq('challenger_id', userId)
          .eq('opponent_id', duelRecord.opponent_id)
          .eq('status', 'won');

        const wins = priorWins ?? [];
        const alreadyBeatThisEdition = wins.some((w) => w.edition_id === duelRecord.edition_id);
        const beatRival = rawRoundScore > duelRecord.target_score;
        duelOutcome = beatRival ? 'won' : 'lost';
        duelBonus =
          beatRival && !alreadyBeatThisEdition && wins.length < MAX_DUEL_BONUSES_PER_RIVAL
            ? 150
            : 0;

        const { error: duelErr } = await supabase
          .from('press_duels')
          .update({
            challenger_score: rawRoundScore,
            status: beatRival ? 'won' : 'lost',
          })
          .eq('id', duelId);
        if (duelErr) console.error('Duel update error:', duelErr.message);

        if (beatRival) {
          const { error: notifErr } = await supabase.from('notifications').insert({
            user_id: duelRecord.opponent_id,
            type: 'rematch',
            message: `Your Copy Desk Ghost (${duelRecord.target_score} pts) was defeated with ${rawRoundScore} pts!`,
            reference_id: duelId,
          });
          if (notifErr) console.error('Notification error:', notifErr.message);
        }
      }
    }

    const totalEarnedThisRun = editionPointsEarned + duelBonus;
    const updatedTotal = (profile?.total_score ?? 0) + totalEarnedThisRun;
    const updatedBest = Math.max(profile?.best_round_score ?? 0, rawRoundScore);
    const updatedRank = calculateRank(updatedTotal);
    const updatedDuelWins = (profile?.duel_wins ?? 0) + (duelOutcome === 'won' ? 1 : 0);

    const prevEditions: string[] = Array.isArray(profile?.unlocked_editions)
      ? profile.unlocked_editions
      : DEFAULT_UNLOCKED;

    const nextEditions =
      edition.nextEditionId && !prevEditions.includes(edition.nextEditionId)
        ? [...prevEditions, edition.nextEditionId]
        : prevEditions;

    const nextCompleted = isRepeat ? prevCompleted : [...prevCompleted, edition.id];

    // 3. Update profiles
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        total_score: updatedTotal,
        best_round_score: updatedBest,
        editorial_rank: updatedRank,
        unlocked_editions: nextEditions,
        completed_editions: nextCompleted,
        duel_wins: updatedDuelWins,
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('Profile update error:', updateErr.message);
    }

    // 4. Insert newly unlocked words into glossary_progress
    const { data: existingWords } = await supabase
      .from('glossary_progress')
      .select('word_id')
      .eq('user_id', userId);

    const existingSet = new Set((existingWords || []).map((row) => row.word_id));
    const newGlossaryRows = allEditionWords
      .filter((w) => !existingSet.has(w.wordId))
      .map((w) => ({
        user_id: userId,
        word_id: w.wordId,
        mastery_tier: 'new',
        next_review_at: new Date().toISOString(),
      }));

    if (newGlossaryRows.length > 0) {
      const { error: glossaryErr } = await supabase
        .from('glossary_progress')
        .insert(newGlossaryRows);

      if (glossaryErr) {
        console.error('Glossary insert error:', glossaryErr.message);
      }
    }

    // 5. Redirect to /reward with full breakdown
    const rewardParams = new URLSearchParams({
      editionId: edition.id,
      score: String(totalEarnedThisRun),
      roundScore: String(rawRoundScore),
      secondsLeft: String(timeLeft),
      lives: String(lives),
      repeat: isRepeat ? '1' : '0',
      duelOutcome,
      duelTarget: String(duelTarget),
      duelBonus: String(duelBonus),
      rival: duelRival,
    });

    router.push(`/reward?${rewardParams.toString()}`);
  }

  if (!edition) {
    return (
      <main className="min-h-screen bg-[#191410] text-[#F2EDE1] p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#F2EDE1] text-[#101311] border-4 border-[#101311] p-6 text-center">
          <h1 className="font-serif text-2xl font-black">Edition Not Found</h1>
          <p className="font-mono text-xs mt-2">
            No copy desk assignment matched ID &ldquo;{editionId}&rdquo;.
          </p>
          <Link
            href="/newsroom"
            className="inline-block mt-4 px-4 py-2 bg-[#101311] text-[#F2EDE1] font-mono text-xs font-bold uppercase"
          >
            ← Back to Newsroom
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono text-xs">
        Loading Copy Desk Manuscript...
      </main>
    );
  }

  if (lives <= 0 || timeLeft === 0) {
    return (
      <main className="min-h-screen bg-[#191410] text-[#101311] p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311] p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-[#932A13] mx-auto mb-2" />
          <p className="font-mono text-[11px] font-bold uppercase text-[#932A13]">
            {lives <= 0 ? 'CREDIBILITY METER DEPLETED' : 'PRESS DEADLINE MISSED'}
          </p>
          <h1 className="font-serif text-2xl font-black mt-1">
            {lives <= 0 ? 'Out of Press Lives (0/5)' : 'Time Ran Out!'}
          </h1>
          <p className="font-mono text-xs text-[#2C251E] mt-2 leading-relaxed">
            {lives <= 0
              ? 'Your press passes regenerate automatically (1 life every 10 minutes). Review unlocked words in the Press Glossary while waiting.'
              : 'You missed the print deadline, but no life was lost. Try this edition again.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {timeLeft === 0 && lives > 0 && (
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-[#932A13] text-white font-mono text-xs font-bold uppercase border-2 border-[#101311]"
              >
                Try Again
              </button>
            )}
            <Link
              href="/newsroom"
              className="w-full py-2.5 bg-[#101311] text-[#F2EDE1] font-mono text-xs font-bold uppercase border-2 border-[#101311]"
            >
              Return to Newsroom
            </Link>
            <Link
              href="/glossary"
              className="w-full py-2.5 bg-white text-[#101311] font-mono text-xs font-bold uppercase border-2 border-[#101311]"
            >
              Open Press Glossary
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311]">
        {/* Top Copy Desk Status Bar */}
        <div className="p-4 border-b-4 border-[#101311] bg-[#EAE2D0] flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/newsroom"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase hover:text-[#932A13]"
          >
            <ArrowLeft className="w-4 h-4" />
            Newsroom
          </Link>

          <div className="flex items-center gap-3 font-mono text-xs font-bold">
            {alreadyCompleted && (
              <span className="px-2.5 py-1 bg-[#2C251E] text-[#F2EDE1] border-2 border-[#101311]">
                PRACTICE REPLAY (0 PTS)
              </span>
            )}
            <span className="px-2.5 py-1 bg-white border-2 border-[#101311]">
              LIVES: {lives}/5
            </span>
            <span
              className={`px-2.5 py-1 border-2 border-[#101311] inline-flex items-center gap-1.5 ${
                timeLeft <= 25 ? 'bg-[#932A13] text-white' : 'bg-[#101311] text-[#F2EDE1]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {minutes}:{seconds}
            </span>
          </div>
        </div>

        {/* Active 1v1 Ghost Duel Banner */}
        {duelId && duelTargetScore > 0 && (
          <div className="px-6 py-2.5 bg-[#932A13] text-white border-b-2 border-[#101311] font-mono text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Swords className="w-4 h-4" /> 1V1 GHOST DUEL VS @{duelRival || 'RIVAL'}
            </span>
            <span>TARGET TO BEAT: {duelTargetScore} PTS (+150 BONUS)</span>
          </div>
        )}

        {/* Edition Masthead */}
        <div className="p-6 border-b-2 border-[#101311]">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase text-[#932A13]">
            <span>
              {edition.category} • {edition.editionNumber}
            </span>
            <span>Paragraph {currentStepIndex + 1} of 3</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-black mt-1 leading-tight">
            {edition.headline}
          </h1>

          {/* 3-Step Progress Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-2 border border-[#101311] ${
                  idx < currentStepIndex
                    ? 'bg-[#1E4D3B]'
                    : idx === currentStepIndex
                    ? 'bg-[#932A13]'
                    : 'bg-white'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Interactive Copy Desk Body */}
        <div className="p-6">
          {currentParagraph && (
            <>
              <div className="mb-4 p-3 bg-[#EAE2D0] border-2 border-[#101311] font-mono text-xs flex items-center gap-2">
                <Newspaper className="w-4 h-4 shrink-0 text-[#932A13]" />
                <span>{currentParagraph.instruction}</span>
              </div>

              {feedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mb-4 p-3 border-2 border-[#101311] font-mono text-xs flex items-start gap-2 ${
                    feedback.type === 'error'
                      ? 'bg-[#932A13] text-white'
                      : 'bg-[#1E4D3B] text-[#F2EDE1]'
                  }`}
                >
                  {feedback.type === 'error' ? (
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* STEP 1: CONTEXT TAP-TRAY */}
              {currentParagraph.type === 'context' && currentParagraph.blanks && (
                <div>
                  <div className="p-5 bg-white border-2 border-[#101311] font-serif text-lg leading-relaxed">
                    <span>{currentParagraph.segments[0]}</span>
                    <button
                      type="button"
                      onClick={() => setActiveBlankIdx(0)}
                      className={`mx-1 px-3 py-0.5 font-mono text-sm font-bold border-2 ${
                        activeBlankIdx === 0
                          ? 'border-[#932A13] bg-[#EAE2D0]'
                          : 'border-[#101311] bg-[#F2EDE1]'
                      }`}
                    >
                      {step1Answers[0] || '[ 1. TAP WORD ]'}
                    </button>
                    <span>{currentParagraph.segments[1]}</span>
                    <button
                      type="button"
                      onClick={() => setActiveBlankIdx(1)}
                      className={`mx-1 px-3 py-0.5 font-mono text-sm font-bold border-2 ${
                        activeBlankIdx === 1
                          ? 'border-[#932A13] bg-[#EAE2D0]'
                          : 'border-[#101311] bg-[#F2EDE1]'
                      }`}
                    >
                      {step1Answers[1] || '[ 2. TAP WORD ]'}
                    </button>
                    <span>{currentParagraph.segments[2]}</span>
                  </div>

                  {/* Word Tray */}
                  <div className="mt-5">
                    <p className="font-mono text-[11px] font-bold uppercase mb-2">
                      Press Wire Token Tray (Inserting into Blank #{activeBlankIdx + 1}):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {currentParagraph.trayOptions?.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => handleSelectToken(token)}
                          className="py-2.5 px-3 bg-white hover:bg-[#101311] hover:text-[#F2EDE1] border-2 border-[#101311] shadow-[3px_3px_0px_#101311] font-mono text-xs font-bold uppercase transition-colors"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={verifyStep1}
                    className="mt-6 w-full py-3 bg-[#1E4D3B] hover:bg-[#101311] text-[#F2EDE1] font-mono text-xs font-bold uppercase border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Approve Paragraph 1 →
                  </button>
                </div>
              )}

              {/* STEP 2: SPELLING PROOFREADER */}
              {currentParagraph.type === 'spelling' && currentParagraph.targets && (
                <div>
                  <div className="p-5 bg-white border-2 border-[#101311] font-serif text-lg leading-relaxed">
                    <span>{currentParagraph.segments[0]}</span>
                    <button
                      type="button"
                      onClick={() => setOpenTargetIdx(0)}
                      className="mx-1 px-2.5 py-0.5 font-mono text-sm font-bold border-2 border-[#932A13] bg-[#EAE2D0] text-[#932A13]"
                    >
                      {step2Answers[0] || currentParagraph.targets[0].typo}
                    </button>
                    <span>{currentParagraph.segments[1]}</span>
                    <button
                      type="button"
                      onClick={() => setOpenTargetIdx(1)}
                      className="mx-1 px-2.5 py-0.5 font-mono text-sm font-bold border-2 border-[#932A13] bg-[#EAE2D0] text-[#932A13]"
                    >
                      {step2Answers[1] || currentParagraph.targets[1].typo}
                    </button>
                    <span>{currentParagraph.segments[2]}</span>
                  </div>

                  {/* Spelling Selector Cards */}
                  <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    {currentParagraph.targets.map((target, idx) => (
                      <div
                        key={target.wordId}
                        className={`p-3 border-2 ${
                          openTargetIdx === idx
                            ? 'border-[#932A13] bg-[#EAE2D0]'
                            : 'border-[#101311] bg-white'
                        }`}
                      >
                        <p className="font-mono text-[11px] font-bold uppercase mb-2">
                          Correction #{idx + 1} (Draft: &ldquo;{target.typo}&rdquo;)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {target.options?.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectSpelling(idx, opt)}
                              className={`px-2.5 py-1.5 border-2 border-[#101311] font-mono text-xs font-bold ${
                                step2Answers[idx] === opt
                                  ? 'bg-[#101311] text-[#F2EDE1]'
                                  : 'bg-white hover:bg-[#EAE2D0]'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={verifyStep2}
                    className="mt-6 w-full py-3 bg-[#1E4D3B] hover:bg-[#101311] text-[#F2EDE1] font-mono text-xs font-bold uppercase border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Approve Paragraph 2 →
                  </button>
                </div>
              )}

              {/* STEP 3: ACTIVE RECALL TYPE-IN */}
              {currentParagraph.type === 'typein' && currentParagraph.blanks && (
                <form onSubmit={verifyStep3AndPublish}>
                  <div className="p-5 bg-white border-2 border-[#101311] font-serif text-lg leading-relaxed">
                    <span>{currentParagraph.segments[0]}</span>
                    <input
                      type="text"
                      value={step3Inputs[0]}
                      onChange={(e) => setStep3Inputs([e.target.value, step3Inputs[1]])}
                      placeholder="TYPE WORD 1"
                      aria-label="Missing word 1"
                      className="mx-1 px-2.5 py-0.5 w-40 bg-[#F2EDE1] border-2 border-[#101311] font-mono text-sm font-bold uppercase"
                    />
                    <span>{currentParagraph.segments[1]}</span>
                    <input
                      type="text"
                      value={step3Inputs[1]}
                      onChange={(e) => setStep3Inputs([step3Inputs[0], e.target.value])}
                      placeholder="TYPE WORD 2"
                      aria-label="Missing word 2"
                      className="mx-1 px-2.5 py-0.5 w-40 bg-[#F2EDE1] border-2 border-[#101311] font-mono text-sm font-bold uppercase"
                    />
                    <span>{currentParagraph.segments[2]}</span>
                  </div>

                  {/* Editorial Clues */}
                  <div className="mt-4 space-y-2">
                    {currentParagraph.blanks.map((blank, idx) => (
                      <div
                        key={blank.wordId}
                        className="p-3 bg-white border-2 border-[#101311] font-mono text-xs flex items-start gap-2"
                      >
                        <HelpCircle className="w-4 h-4 text-[#932A13] shrink-0 mt-0.5" />
                        <span>
                          <strong>Blank #{idx + 1}:</strong> {blank.clue}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 w-full py-3 bg-[#932A13] hover:bg-[#101311] text-white font-mono text-xs font-bold uppercase border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Publishing Edition...' : 'Publish Final Edition →'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}