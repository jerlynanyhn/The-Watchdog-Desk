'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Newspaper,
  RotateCcw,
  ShieldCheck,
  Swords,
  Trophy,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import editionsData from '@/data/editions.json';

const EDITIONS = editionsData as Record<
  string,
  {
    id: string;
    category: string;
    editionNumber: string;
    headline: string;
    nextEditionId: string | null;
  }
>;

function RewardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editionId = searchParams.get('editionId') || 'editorial-01';
  const totalEarned = Number(searchParams.get('score') || 0);
  const roundScore = Number(searchParams.get('roundScore') || totalEarned);
  const secondsLeft = Number(searchParams.get('secondsLeft') || 0);
  const lives = Number(searchParams.get('lives') || 5);
  const isRepeat = searchParams.get('repeat') === '1';
  const duelOutcome = searchParams.get('duelOutcome') || 'none'; // 'none' | 'won' | 'lost'
  const duelTarget = Number(searchParams.get('duelTarget') || 0);
  const rival = searchParams.get('rival') || '';

  const [profile, setProfile] = useState<{
    total_score: number;
    editorial_rank: string;
  } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('total_score, editorial_rank')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    }

    loadProfile();
  }, [router]);

  const edition = EDITIONS[editionId];

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311]">
        {/* Header Banner */}
        <div className="p-6 border-b-4 border-[#101311] bg-[#EAE2D0] text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#1E4D3B]">
            {isRepeat ? 'PRACTICE REPLAY COMPLETE' : 'FINAL EDITION CLEARED FOR PRESS'}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-black mt-1">
            {isRepeat ? 'Practice Run Verified!' : 'Edition Published!'}
          </h1>
          {edition && (
            <p className="font-mono text-xs text-[#2C251E] mt-1">
              {edition.category} • {edition.editionNumber}: {edition.headline}
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* 1v1 Ghost Duel Result Banner */}
          {duelOutcome === 'won' && (
            <div className="p-4 bg-[#1E4D3B] text-[#F2EDE1] border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center gap-3">
              <Swords className="w-6 h-6 shrink-0 text-[#F2EDE1]" />
              <div className="font-mono text-xs">
                <p className="font-black uppercase">
                  1v1 Ghost Duel Victory vs @{rival || 'Rival'}!
                </p>
                <p className="mt-0.5">
                  Your round score ({roundScore} pts) beat their Ghost target ({duelTarget} pts)
                  for a <strong>+150 pt Duel Bonus</strong>!
                </p>
              </div>
            </div>
          )}

          {duelOutcome === 'lost' && (
            <div className="p-4 bg-[#932A13] text-white border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center gap-3">
              <Swords className="w-6 h-6 shrink-0" />
              <div className="font-mono text-xs">
                <p className="font-black uppercase">
                  Ghost Duel Fell Short vs @{rival || 'Rival'}
                </p>
                <p className="mt-0.5">
                  You scored {roundScore} pts, but needed more than {duelTarget} pts to claim the
                  +150 pt bonus.
                </p>
              </div>
            </div>
          )}

          {/* Practice Replay Notice */}
          {isRepeat && (
            <div className="p-3 bg-white border-2 border-[#101311] font-mono text-xs flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 shrink-0 text-[#932A13] mt-0.5" />
              <span>
                <strong>Practice Replay (0 Edition Pts):</strong> You already earned career
                points for clearing this edition. Play new editions or win 1v1 Ghost Duels to
                climb the leaderboard!
              </span>
            </div>
          )}

          {/* Career Points Earned Card */}
          <div className="p-5 bg-white border-2 border-[#101311] text-center">
            <p className="font-mono text-[11px] font-bold uppercase text-[#2C251E]">
              Career Points Added This Run
            </p>
            <p className="font-serif text-5xl font-black text-[#932A13] mt-1">
              +{totalEarned} <span className="text-xl">PTS</span>
            </p>
            <p className="font-mono text-[11px] text-[#2C251E] mt-1">
              Round Performance Score: <strong>{roundScore} pts</strong>
            </p>
            {profile && (
              <p className="font-mono text-xs font-bold text-[#1E4D3B] mt-2">
                Career Total: {profile.total_score} pts • Rank: {profile.editorial_rank}
              </p>
            )}
          </div>

          {/* 3-Metric Breakdown */}
          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-white border-2 border-[#101311] text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-[#932A13]" />
              <p className="font-black">{secondsLeft}s</p>
              <p className="text-[10px] text-gray-600">TIME LEFT</p>
            </div>

            <div className="p-3 bg-white border-2 border-[#101311] text-center">
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-[#1E4D3B]" />
              <p className="font-black">{lives}/5</p>
              <p className="text-[10px] text-gray-600">LIVES LEFT</p>
            </div>

            <div className="p-3 bg-white border-2 border-[#101311] text-center">
              <BookOpen className="w-4 h-4 mx-auto mb-1 text-[#101311]" />
              <p className="font-black">{isRepeat ? 'PRACTICE' : '+6 NEW'}</p>
              <p className="text-[10px] text-gray-600">
                {isRepeat ? 'REPLAY MODE' : 'GLOSSARY WORDS'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {edition?.nextEditionId && (
              <Link
                href={`/play/${edition.nextEditionId}`}
                className="w-full py-3 bg-[#1E4D3B] hover:bg-[#101311] text-[#F2EDE1] font-mono text-xs font-bold uppercase border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Play Next Unlocked Edition →
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/glossary"
                className="py-2.5 bg-white hover:bg-[#EAE2D0] text-[#101311] font-mono text-xs font-bold uppercase border-2 border-[#101311] flex items-center justify-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                Press Glossary
              </Link>

              <Link
                href="/leaderboard"
                className="py-2.5 bg-white hover:bg-[#EAE2D0] text-[#101311] font-mono text-xs font-bold uppercase border-2 border-[#101311] flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                Leaderboards
              </Link>
            </div>

            <Link
              href="/newsroom"
              className="w-full py-2.5 bg-[#101311] hover:bg-[#932A13] text-[#F2EDE1] font-mono text-xs font-bold uppercase border-2 border-[#101311] flex items-center justify-center gap-1.5"
            >
              <Newspaper className="w-4 h-4" />
              Return to Newsroom
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RewardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono text-xs">
          Printing Press Summary...
        </main>
      }
    >
      <RewardContent />
    </Suspense>
  );
}