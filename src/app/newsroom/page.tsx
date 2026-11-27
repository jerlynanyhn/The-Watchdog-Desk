'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, HelpCircle, BookOpen, Trophy, User, LogOut, Lock, Newspaper } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { computeCurrentLives } from '@/lib/gameRules';
import { AvatarPortrait } from '@/components/AvatarPortrait';
import editionsData from '@/data/editions.json';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  gender: string;
  avatar_id: string;
  total_score: number;
  best_round_score: number;
  editorial_rank: string;
  lives_count: number;
  lives_updated_at: string;
  unlocked_editions: string[];
}

interface EditionItem {
  id: string;
  category: string;
  editionNumber: string;
  headline: string;
}

const EDITIONS_MAP = editionsData as Record<string, EditionItem>;

const CATEGORY_META = [
  {
    name: 'Editorial',
    subtitle: 'Civic Commentary & Public Policy',
    ids: ['editorial-01', 'editorial-02', 'editorial-03'],
  },
  {
    name: 'Feature Writing',
    subtitle: 'Human Interest & Cultural Heritage',
    ids: ['feature-01', 'feature-02', 'feature-03'],
  },
  {
    name: 'Entertainment',
    subtitle: 'Arts, Cinema & Pop Culture',
    ids: ['entertainment-01', 'entertainment-02', 'entertainment-03'],
  },
] as const;

export default function NewsroomPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentLives, setCurrentLives] = useState(5);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNewsroom();
  }, []);

  async function loadNewsroom() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (prof) {
      const { currentLives: computed, justRefilled } = computeCurrentLives(
        prof.lives_count,
        prof.lives_updated_at
      );
      setCurrentLives(computed);
      setProfile(prof);

      if (computed !== prof.lives_count) {
        await supabase
          .from('profiles')
          .update({ lives_count: computed, lives_updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (justRefilled) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'lives_full',
            message: 'All 5 Rolled Newspaper lives have been restored! Ready for print.',
          });
        }
      }
    }

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setNotifications(notifs || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function markNotifsRead() {
    setShowNotifs(!showNotifs);
    if (!showNotifs && profile) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
        Loading Newsroom Copy Desk...
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311]">
        {/* Top Newsroom Header */}
        <header className="p-4 md:p-6 border-b-4 border-[#101311] bg-[#EAE2D0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <AvatarPortrait avatarId={profile.avatar_id} size="md" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl md:text-3xl font-black">THE BOOLEAN BULLETIN</h1>
                <span className="px-2 py-0.5 bg-[#101311] text-[#F2EDE1] font-mono text-[11px] uppercase">
                  {profile.editorial_rank}
                </span>
              </div>
              <p className="text-xs font-mono mt-0.5 text-[#2C251E]">
                Editor: <strong>{profile.full_name}</strong> (@{profile.username}) • Career Score:{' '}
                <strong>{profile.total_score} pts</strong>
              </p>
            </div>
          </div>

          {/* Right HUD Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shared 5/5 Rolled Newspaper Lives */}
            <div
              className="px-3 py-2 bg-white border-2 border-[#101311] flex items-center gap-1.5"
              title="Shared Newspaper Lives (1 regenerates every 10 mins)"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <Newspaper
                  key={num}
                  className={`w-4 h-4 ${
                    num <= currentLives ? 'text-[#932A13]' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="font-mono text-xs font-bold ml-1">{currentLives}/5</span>
            </div>

            {/* How to Play Modal Trigger */}
            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-3 py-2 bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] text-xs font-bold flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4 text-[#1E4D3B]" />
              How to Play
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={markNotifsRead}
                className="p-2 bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#932A13] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-[#F2EDE1] border-3 border-[#101311] shadow-[6px_6px_0px_#101311] z-30 p-3">
                  <div className="flex justify-between items-center border-b-2 border-[#101311] pb-2 mb-2">
                    <span className="font-bold text-xs uppercase">Newsroom Wire Alerts</span>
                    <button
                      onClick={() => setShowNotifs(false)}
                      className="text-xs font-bold px-1.5 hover:bg-[#EAE2D0]"
                    >
                      ✕
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#2C251E] py-3 text-center">
                      No new wire alerts yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-2 bg-white border border-[#101311] text-xs">
                          <p>{n.message}</p>
                          {(n.type === 'duel_challenge' || n.type === 'rematch') && (
                            <Link
                              href="/leaderboard"
                              className="inline-block mt-1.5 px-2 py-1 bg-[#932A13] text-white font-bold text-[11px]"
                            >
                              View Duel / Rematch →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-[#101311] text-[#F2EDE1] hover:bg-[#2C251E] text-xs font-bold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          </div>
        </header>

        {/* Sub-Navigation Bar */}
        <nav className="px-4 md:px-6 py-3 border-b-2 border-[#101311] bg-[#F7F3EA] flex flex-wrap gap-3">
          <Link
            href="/glossary"
            className="px-4 py-2 bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-[#1E4D3B]" />
            Press Glossary & Quick Drill
          </Link>
          <Link
            href="/leaderboard"
            className="px-4 py-2 bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4 text-[#932A13]" />
            Leaderboards & 1v1 Duels
          </Link>
          <Link
            href="/profile"
            className="px-4 py-2 bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <User className="w-4 h-4" />
            Press ID Card
          </Link>
        </nav>

        {/* 3-Column Category Desk Grid (Driven by editions.json) */}
        <section className="p-4 md:p-6 grid md:grid-cols-3 gap-6">
          {CATEGORY_META.map((cat) => (
            <div key={cat.name} className="border-2 border-[#101311] bg-[#F7F3EA] p-4 flex flex-col">
              <div className="border-b-2 border-[#101311] pb-3 mb-4">
                <h2 className="font-serif text-2xl font-black">{cat.name}</h2>
                <p className="text-xs text-[#2C251E] mt-0.5">{cat.subtitle}</p>
              </div>

              <div className="space-y-3 flex-1">
                {cat.ids.map((id) => {
                  const ed = EDITIONS_MAP[id];
                  if (!ed) return null;
                  const isUnlocked = profile.unlocked_editions?.includes(ed.id);

                  return (
                    <div
                      key={ed.id}
                      className={`p-3.5 border-2 border-[#101311] ${
                        isUnlocked ? 'bg-white' : 'bg-[#E5DEC9] opacity-75'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] font-mono font-bold">
                        <span className="text-[#932A13]">{ed.editionNumber} • 6 WORDS</span>
                        {!isUnlocked && (
                          <span className="px-2 py-0.5 bg-[#101311] text-[#F2EDE1] flex items-center gap-1">
                            <Lock className="w-3 h-3" /> LOCKED
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif font-bold text-base mt-1.5 leading-snug">
                        {ed.headline}
                      </h3>

                      {isUnlocked && (
                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/play/${ed.id}`}
                            className={`flex-1 py-2 text-center text-xs font-bold uppercase border-2 border-[#101311] ${
                              currentLives > 0
                                ? 'bg-[#101311] text-[#F2EDE1] hover:bg-[#1E4D3B]'
                                : 'bg-gray-300 text-gray-600 pointer-events-none'
                            }`}
                          >
                            {currentLives > 0 ? 'Enter Copy Desk →' : 'Out of Lives'}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* How to Play Tutorial Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311] p-6">
            <div className="flex justify-between items-center border-b-2 border-[#101311] pb-3">
              <h2 className="font-serif text-2xl font-black">How to Play: Copy Desk Guide</h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="px-2.5 py-1 bg-[#101311] text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p>
                <strong>1. Beat the 120-Second Print Deadline:</strong> Each edition has{' '}
                <strong>3 paragraphs</strong> with <strong>2 vocabulary tasks each</strong> (6
                unique words total).
              </p>
              <p>
                <strong>2. Three Escalating Tasks:</strong>
                <br />• <strong>Paragraph 1:</strong> Tap the right context words from the word tray.
                <br />• <strong>Paragraph 2:</strong> Spot and fix two misspelled words.
                <br />• <strong>Paragraph 3:</strong> Type the final two formal words from memory.
              </p>
              <p>
                <strong>3. Guard Your 5 Newspaper Lives:</strong> Wrong answers deduct 1 life and
                trigger feedback from the Senior Desk Editor. Lives regenerate automatically (1 every
                10 mins).
              </p>
              <p>
                <strong>4. Master Words in the Press Glossary:</strong> Review unlocked words in
                the time-gated <em>Quick Practice Drill</em> to earn bonus rank points!
              </p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-5 w-full py-2.5 bg-[#1E4D3B] text-[#F2EDE1] font-bold uppercase text-xs border-2 border-[#101311]"
            >
              Got It — Back to Newsroom
            </button>
          </div>
        </div>
      )}
    </div>
  );
}