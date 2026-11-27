'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Award, BookOpen, Newspaper, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AvatarPortrait } from '@/components/AvatarPortrait';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [masteredCount, setMasteredCount] = useState(0);
  const [unlockedWordsCount, setUnlockedWordsCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) setProfile(prof);

      const { data: words } = await supabase
        .from('glossary_progress')
        .select('mastery_tier')
        .eq('user_id', user.id);

      if (words) {
        setUnlockedWordsCount(words.length);
        setMasteredCount(words.filter((w) => w.mastery_tier === 'mastered').length);
      }
    }
    loadProfile();
  }, [router]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
        Verifying Press Credentials...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311]">
        {/* Top Navigation */}
        <div className="p-4 border-b-4 border-[#101311] bg-[#EAE2D0] flex justify-between items-center">
          <Link
            href="/newsroom"
            className="px-3 py-1.5 bg-white hover:bg-[#101311] hover:text-white border-2 border-[#101311] text-xs font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Newsroom
          </Link>
          <span className="font-mono text-xs font-bold uppercase text-[#932A13]">
            OFFICIAL PRESS CREDENTIAL
          </span>
        </div>

        {/* Official Press ID Card */}
        <div className="p-6 md:p-8">
          <div className="border-4 border-[#101311] bg-[#F7F3EA] p-6 relative">
            <div className="flex justify-between items-start border-b-2 border-[#101311] pb-4">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#932A13]">
                  THE BOOLEAN BULLETIN • METRO MALINAM
                </p>
                <h1 className="font-serif text-3xl font-black mt-0.5">PRESS PASS</h1>
              </div>
              <ShieldCheck className="w-8 h-8 text-[#1E4D3B]" />
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <AvatarPortrait avatarId={profile.avatar_id} size="lg" />
              <div className="text-center sm:text-left">
                <span className="px-2.5 py-0.5 bg-[#101311] text-[#F2EDE1] font-mono text-xs uppercase">
                  {profile.editorial_rank}
                </span>
                <h2 className="font-serif text-2xl font-black mt-2">{profile.full_name}</h2>
                <p className="font-mono text-xs text-[#2C251E]">
                  @{profile.username} • {profile.gender} Desk
                </p>
                <p className="font-mono text-[11px] text-gray-500 mt-1">
                  ID: {profile.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-6 pt-5 border-t-2 border-[#101311] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
              <div className="p-2.5 bg-white border border-[#101311]">
                <Award className="w-4 h-4 mx-auto text-[#932A13] mb-1" />
                <p className="text-sm font-black">{profile.total_score}</p>
                <p className="text-[10px] text-gray-600">TOTAL PTS</p>
              </div>
              <div className="p-2.5 bg-white border border-[#101311]">
                <Newspaper className="w-4 h-4 mx-auto text-[#1E4D3B] mb-1" />
                <p className="text-sm font-black">{profile.best_round_score || 0}</p>
                <p className="text-[10px] text-gray-600">BEST ROUND</p>
              </div>
              <div className="p-2.5 bg-white border border-[#101311]">
                <BookOpen className="w-4 h-4 mx-auto text-[#101311] mb-1" />
                <p className="text-sm font-black">{unlockedWordsCount}/54</p>
                <p className="text-[10px] text-gray-600">LEXICON</p>
              </div>
              <div className="p-2.5 bg-white border border-[#101311]">
                <ShieldCheck className="w-4 h-4 mx-auto text-[#1E4D3B] mb-1" />
                <p className="text-sm font-black">{masteredCount}</p>
                <p className="text-[10px] text-gray-600">MASTERED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}