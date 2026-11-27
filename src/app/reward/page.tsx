'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Newspaper, Award, BookOpen, ArrowRight, Trophy } from 'lucide-react';
import editionsData from '@/data/editions.json';
import { supabase } from '@/lib/supabase';

function RewardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const editionId = searchParams.get('editionId') || 'editorial-01';
  const pointsEarned = Number(searchParams.get('score') || 0);
  const roundScore = Number(searchParams.get('roundScore') || 0);
  const secondsLeft = Number(searchParams.get('secondsLeft') || 0);
  const livesLeft = Number(searchParams.get('lives') || 5);
  const isRepeat = searchParams.get('repeat') === '1';
  const duelOutcome = searchParams.get('duelOutcome') || 'none';
  const duelBonus = Number(searchParams.get('duelBonus') || 0);
  const duelWon = duelOutcome === 'won';

  const edition = (editionsData as any)[editionId];
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, [router]);

  if (!edition || !profile) {
    return (
      <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
        Printing Front-Page Edition...
      </div>
    );
  }

  const p1 = edition.paragraphs[0];
  const p2 = edition.paragraphs[1];
  const p3 = edition.paragraphs[2];

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311]">
        {/* Top Press Banner */}
        <div className="bg-[#1E4D3B] text-[#F2EDE1] px-6 py-3 border-b-4 border-[#101311] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-yellow-300" />
            <span>EXTRA! EDITION APPROVED FOR MORNING PRINT</span>
          </div>
          <span className="font-mono text-xs">
            {isRepeat ? 'PRACTICE REPLAY • 0 PTS' : `+${pointsEarned} PTS EARNED`}
            {duelWon && duelBonus > 0 && ` • +${duelBonus} 1V1 DUEL BONUS!`}
            {duelWon && duelBonus === 0 && ' • GHOST DEFEATED (NO BONUS)'}
          </span>
        </div>

        {/* Broadsheet Front-Page Clipping */}
        <div className="p-6 md:p-10">
          <div className="text-center border-b-4 border-double border-[#101311] pb-4 mb-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#932A13] font-bold">
              METRO MALINAM • {edition.category} • {edition.editionNumber}
            </p>
            <h1 className="font-serif text-3xl md:text-5xl font-black tracking-tight mt-1">
              THE BOOLEAN BULLETIN
            </h1>
            <div className="flex justify-between items-center text-[11px] font-mono mt-3 pt-2 border-t border-[#101311]">
              <span>FINAL EDITION</span>
              <span>VERIFIED BY: {profile.full_name.toUpperCase()}</span>
              <span>RANK: {profile.editorial_rank.toUpperCase()}</span>
            </div>
          </div>

          {/* Published Headline & Completed Article */}
          <article className="bg-[#F7F3EA] border-2 border-[#101311] p-5 md:p-6">
            <h2 className="font-serif text-2xl md:text-3xl font-black leading-tight mb-3">
              {edition.headline}
            </h2>
            <p className="font-mono text-xs text-[#2C251E] mb-4 pb-3 border-b border-[#101311]">
              By <strong>{profile.full_name}</strong> (@{profile.username}) • Copy Desk Verified
            </p>

            <div className="space-y-4 font-serif text-base leading-relaxed text-[#101311]">
              <p>
                {p1.segments[0]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p1.blanks[0].answer}
                </strong>
                {p1.segments[1]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p1.blanks[1].answer}
                </strong>
                {p1.segments[2]}
              </p>
              <p>
                {p2.segments[0]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p2.targets[0].answer}
                </strong>
                {p2.segments[1]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p2.targets[1].answer}
                </strong>
                {p2.segments[2]}
              </p>
              <p>
                {p3.segments[0]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p3.blanks[0].answer}
                </strong>
                {p3.segments[1]}
                <strong className="text-[#1E4D3B] underline decoration-2">
                  {p3.blanks[1].answer}
                </strong>
                {p3.segments[2]}
              </p>
            </div>
          </article>

          {/* Round Performance Summary Strip */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 bg-white border-2 border-[#101311]">
              <p className="text-[10px] uppercase text-[#2C251E]">Round Score</p>
              <p className="text-lg font-black text-[#1E4D3B]">{roundScore}</p>
            </div>
            <div className="p-3 bg-white border-2 border-[#101311]">
              <p className="text-[10px] uppercase text-[#2C251E]">Time Remaining</p>
              <p className="text-lg font-black">{secondsLeft}s</p>
            </div>
            <div className="p-3 bg-white border-2 border-[#101311]">
              <p className="text-[10px] uppercase text-[#2C251E]">Lives Intact</p>
              <p className="text-lg font-black text-[#932A13] flex items-center justify-center gap-1">
                <Newspaper className="w-4 h-4" /> {livesLeft}/5
              </p>
            </div>
            <div className="p-3 bg-white border-2 border-[#101311]">
              <p className="text-[10px] uppercase text-[#2C251E]">Words Unlocked</p>
              <p className="text-lg font-black">{isRepeat ? 'No new words' : '+6 New'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/newsroom"
              className="flex-1 py-3 px-4 bg-[#101311] hover:bg-[#2C251E] text-[#F2EDE1] font-bold uppercase text-xs text-center border-2 border-[#101311] flex items-center justify-center gap-2"
            >
              Next Assignment in Newsroom <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/glossary"
              className="py-3 px-4 bg-white hover:bg-[#EAE2D0] text-[#101311] font-bold uppercase text-xs border-2 border-[#101311] flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-[#1E4D3B]" /> Review in Glossary
            </Link>
            {duelOutcome !== 'none' && (
              <Link
                href="/leaderboard"
                className="py-3 px-4 bg-[#932A13] text-white font-bold uppercase text-xs border-2 border-[#101311] flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-4 h-4" /> View Duel Standing
              </Link>
            )}
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
        <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
          Typesetting Front Page...
        </div>
      }
    >
      <RewardContent />
    </Suspense>
  );
}