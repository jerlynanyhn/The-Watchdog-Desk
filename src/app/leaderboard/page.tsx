'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Swords, Trophy } from 'lucide-react';
import editionsData from '@/data/editions.json';
import { supabase } from '@/lib/supabase';
import { calculateRank } from '@/lib/gameRules';
import { AvatarPortrait } from '@/components/AvatarPortrait';

export default function LeaderboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [editors, setEditors] = useState<any[]>([]);
  const [wonEditionsByRival, setWonEditionsByRival] = useState<Record<string, Set<string>>>({});
  const [selectedRival, setSelectedRival] = useState<any>(null);
  const [selectedEdition, setSelectedEdition] = useState('editorial-01');
  const [creatingDuel, setCreatingDuel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (myProf) setMe(myProf);

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(20);

    setEditors(allProfiles || []);

    // Track which specific editions have already been won against each rival
    const { data: wonDuels } = await supabase
      .from('press_duels')
      .select('opponent_id, edition_id')
      .eq('challenger_id', user.id)
      .eq('status', 'won');

    const map: Record<string, Set<string>> = {};
    for (const d of wonDuels || []) {
      if (!map[d.opponent_id]) map[d.opponent_id] = new Set();
      map[d.opponent_id].add(d.edition_id);
    }
    setWonEditionsByRival(map);
    setLoading(false);
  }

  function getAvailableEditionsForRival(rivalId: string): string[] {
    const unlocked: string[] =
      Array.isArray(me?.unlocked_editions) && me.unlocked_editions.length > 0
        ? me.unlocked_editions
        : ['editorial-01', 'feature-01', 'entertainment-01'];

    const beatenSet = wonEditionsByRival[rivalId] || new Set<string>();
    return unlocked.filter((edId) => !beatenSet.has(edId));
  }

  function openDuelModal(rival: any) {
    const available = getAvailableEditionsForRival(rival.id);
    if (available.length === 0) return;

    const randomEd = available[Math.floor(Math.random() * available.length)];
    setSelectedEdition(randomEd);
    setSelectedRival(rival);
  }

  async function handleStartGhostDuel() {
    if (!me || !selectedRival) return;
    setCreatingDuel(true);

    const targetScore = Math.max(250, selectedRival.best_round_score || 300);

    const { data: duelRow, error } = await supabase
      .from('press_duels')
      .insert({
        challenger_id: me.id,
        opponent_id: selectedRival.id,
        edition_id: selectedEdition,
        target_score: targetScore,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && duelRow) {
      await supabase.from('notifications').insert({
        user_id: selectedRival.id,
        type: 'duel_challenge',
        message: `@${me.username} challenged your Copy Desk Ghost (${targetScore} pts) on ${selectedEdition.toUpperCase()}!`,
        reference_id: duelRow.id,
      });

      const params = new URLSearchParams({
        duelId: duelRow.id,
        targetScore: String(targetScore),
        rival: selectedRival.username,
      });
      router.push(`/play/${selectedEdition}?${params.toString()}`);
    } else {
      setCreatingDuel(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
        Loading Newsroom Standings...
      </div>
    );
  }

  const assignedEditionObj = (editionsData as any)[selectedEdition];
  const myUnlockedCount =
    Array.isArray(me?.unlocked_editions) && me.unlocked_editions.length > 0
      ? me.unlocked_editions.length
      : 3;

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-6">
      <div className="max-w-5xl mx-auto bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311]">
        <header className="p-5 border-b-4 border-[#101311] bg-[#EAE2D0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/newsroom"
              className="px-3 py-2 bg-white hover:bg-[#101311] hover:text-white border-2 border-[#101311] text-xs font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Newsroom
            </Link>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-black flex items-center gap-2">
                <Trophy className="w-6 h-6 text-[#932A13]" /> NEWSROOM RANKINGS & 1V1 DUELS
              </h1>
              <p className="text-xs font-mono text-[#2C251E]">
                Beat a rival’s Ghost once per unlocked edition for a +150 pt Duel Bonus
              </p>
            </div>
          </div>
        </header>

        <section className="p-5 md:p-6 space-y-2.5">
          {editors.map((ed, idx) => {
            const isMe = ed.id === me.id;
            const availableEditions = isMe ? [] : getAvailableEditionsForRival(ed.id);
            const beatenCount = wonEditionsByRival[ed.id]?.size || 0;
            const allUnlockedBeaten = availableEditions.length === 0;
            const liveRank = calculateRank(ed.total_score || 0);

            return (
              <div
                key={ed.id}
                className={`p-3.5 border-2 border-[#101311] flex flex-wrap items-center justify-between gap-3 ${
                  isMe ? 'bg-[#EAE2D0]' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 font-mono font-black text-base text-center">
                    #{idx + 1}
                  </span>
                  <AvatarPortrait avatarId={ed.avatar_id} size="sm" />
                  <div>
                    <p className="font-bold text-sm">
                      {ed.full_name}{' '}
                      <span className="font-mono text-xs text-[#2C251E]">(@{ed.username})</span>
                      {isMe && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[#101311] text-white text-[10px] font-mono">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-[#1E4D3B] font-bold">
                      {liveRank} • Ghost Best: {ed.best_round_score || 0} pts •{' '}
                      {ed.duel_wins || 0} Duel Wins
                      {!isMe && ` • Beaten: ${beatenCount}/${myUnlockedCount} Editions`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono">
                    <p className="text-sm font-black">{ed.total_score} pts</p>
                    <p className="text-[10px] text-gray-500">CAREER SCORE</p>
                  </div>

                  {!isMe &&
                    (allUnlockedBeaten ? (
                      <span className="px-3 py-2 bg-[#EAE2D0] text-[#1E4D3B] text-xs font-mono font-bold uppercase border-2 border-[#101311] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cleared ({beatenCount}/{myUnlockedCount})
                      </span>
                    ) : (
                      <button
                        onClick={() => openDuelModal(ed)}
                        className="px-3 py-2 bg-[#932A13] hover:bg-[#7A210E] text-white text-xs font-bold uppercase border-2 border-[#101311] flex items-center gap-1.5"
                      >
                        <Swords className="w-3.5 h-3.5" /> Duel Ghost ({availableEditions.length} left)
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* 1v1 Ghost Duel Setup Modal */}
      {selectedRival && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311] p-6">
            <div className="flex justify-between items-center border-b-2 border-[#101311] pb-3">
              <h2 className="font-serif text-xl font-black">1v1 Ghost Race Challenge</h2>
              <button
                onClick={() => setSelectedRival(null)}
                className="px-2 py-0.5 bg-[#101311] text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#2C251E] mt-3 leading-relaxed">
              You are challenging <strong>@{selectedRival.username}</strong>’s Copy Desk Ghost.
              Score higher than{' '}
              <strong>{Math.max(250, selectedRival.best_round_score || 300)} pts</strong> before the
              120s deadline to earn a <strong>+150 pt Duel Bonus</strong>!
            </p>

            <div className="mt-4 p-3 bg-white border-2 border-[#101311] font-mono text-xs">
              <p className="text-[10px] uppercase text-gray-500 font-bold">
                Randomly Assigned Unbeaten Edition:
              </p>
              <p className="font-bold text-[#101311] mt-1">
                {assignedEditionObj?.category} — {assignedEditionObj?.editionNumber}:{' '}
                {assignedEditionObj?.headline}
              </p>
            </div>

            <button
              disabled={creatingDuel}
              onClick={handleStartGhostDuel}
              className="mt-5 w-full py-3 bg-[#932A13] text-white font-bold uppercase text-xs border-2 border-[#101311] shadow-[3px_3px_0px_#101311]"
            >
              {creatingDuel ? 'Preparing Copy Desk...' : 'Start 1v1 Ghost Duel →'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}