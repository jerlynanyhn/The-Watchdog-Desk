'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react';
import editionsData from '@/data/editions.json';
import { supabase } from '@/lib/supabase';
import { calculateRank } from '@/lib/gameRules';

interface WordEntry {
  wordId: string;
  answer: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  synonyms: string[];
  example: string;
  category: string;
}

export default function GlossaryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [allWords, setAllWords] = useState<WordEntry[]>([]);
  const [filterTier, setFilterTier] = useState<'all' | 'new' | 'familiar' | 'mastered'>('all');

  // Quick Practice Drill state
  const [drillWord, setDrillWord] = useState<WordEntry | null>(null);
  const [drillOptions, setDrillOptions] = useState<string[]>([]);
  const [drillFeedback, setDrillFeedback] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flatten all words from editions.json
    const extracted: WordEntry[] = [];
    Object.values(editionsData as any).forEach((ed: any) => {
      ed.paragraphs.forEach((p: any) => {
        const items = p.blanks || p.targets || [];
        items.forEach((item: any) => {
          extracted.push({
            wordId: item.wordId,
            answer: item.answer,
            phonetic: item.phonetic || '',
            partOfSpeech: item.partOfSpeech || 'Term',
            definition: item.definition,
            synonyms: item.synonyms || [],
            example: item.example,
            category: ed.category,
          });
        });
      });
    });
    setAllWords(extracted);
    loadGlossaryData();
  }, []);

  async function loadGlossaryData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUserId(user.id);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) setProfile(prof);

    const { data: rows } = await supabase
      .from('glossary_progress')
      .select('*')
      .eq('user_id', user.id);

    const map: Record<string, any> = {};
    (rows || []).forEach((r) => {
      map[r.word_id] = r;
    });
    setProgressMap(map);
    setLoading(false);
  }

  function startQuickDrill(word: WordEntry) {
    // Pick 3 random distractor definitions from other words
    const others = allWords
      .filter((w) => w.wordId !== word.wordId)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.definition);

    const choices = [word.definition, ...others].sort(() => 0.5 - Math.random());
    setDrillWord(word);
    setDrillOptions(choices);
    setDrillFeedback('');
  }

  async function handleDrillAnswer(selectedDef: string) {
    if (!drillWord || !userId || !profile) return;
    const record = progressMap[drillWord.wordId];
    const currentTier = record?.mastery_tier || 'new';
    const isCorrect = selectedDef === drillWord.definition;

    let nextTier = currentTier;
    let bonusPts = 0;

    if (isCorrect) {
      if (currentTier === 'new') {
        nextTier = 'familiar';
        bonusPts = 25;
      } else if (currentTier === 'familiar') {
        nextTier = 'mastered';
        bonusPts = 50;
      } else {
        bonusPts = 10;
      }
      setDrillFeedback(
        `Correct! "${drillWord.answer}" promoted to ${nextTier.toUpperCase()} (+${bonusPts} pts). Next review unlocked in 15 mins.`
      );
    } else {
      // Spaced-repetition demotion rule on failure
      nextTier = currentTier === 'mastered' ? 'familiar' : 'new';
      setDrillFeedback(
        `Incorrect. "${drillWord.answer}" means: "${drillWord.definition}". Tier adjusted to ${nextTier.toUpperCase()}.`
      );
    }

    const nextReview = new Date(Date.now() + 15 * 60000).toISOString(); // 15-min anti-spam cooldown

    await supabase
      .from('glossary_progress')
      .update({
        mastery_tier: nextTier,
        next_review_at: nextReview,
      })
      .eq('user_id', userId)
      .eq('word_id', drillWord.wordId);

    if (bonusPts > 0) {
      const newTotal = profile.total_score + bonusPts;
      await supabase
        .from('profiles')
        .update({
          total_score: newTotal,
          editorial_rank: calculateRank(newTotal),
        })
        .eq('id', userId);
    }

    await loadGlossaryData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#191410] text-[#F2EDE1] flex items-center justify-center font-mono">
        Opening Press Glossary Archive...
      </div>
    );
  }

  const unlockedWords = allWords.filter((w) => Boolean(progressMap[w.wordId]));
  const filteredWords = unlockedWords.filter((w) => {
    if (filterTier === 'all') return true;
    return progressMap[w.wordId]?.mastery_tier === filterTier;
  });

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311]">
        {/* Header */}
        <header className="p-5 border-b-4 border-[#101311] bg-[#EAE2D0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/newsroom"
              className="px-3 py-2 bg-white hover:bg-[#101311] hover:text-white border-2 border-[#101311] text-xs font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Newsroom
            </Link>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-black">PRESS GLOSSARY</h1>
              <p className="text-xs font-mono text-[#2C251E]">
                Spaced-Repetition Lexicon • {unlockedWords.length} / {allWords.length} Words
                Unlocked
              </p>
            </div>
          </div>

          {/* Tier Filters */}
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {(['all', 'new', 'familiar', 'mastered'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1.5 uppercase font-bold border-2 border-[#101311] ${
                  filterTier === tier
                    ? 'bg-[#101311] text-[#F2EDE1]'
                    : 'bg-white hover:bg-[#EAE2D0]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </header>

        {/* Glossary Grid */}
        <section className="p-5 md:p-6">
          {unlockedWords.length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-[#101311] bg-[#F7F3EA]">
              <BookOpen className="w-10 h-10 mx-auto text-[#932A13] mb-2" />
              <h2 className="font-serif text-xl font-bold">Your Lexicon Is Empty</h2>
              <p className="text-xs text-[#2C251E] mt-1">
                Complete any edition on the Copy Desk to unlock its 6 vocabulary words here.
              </p>
              <Link
                href="/newsroom"
                className="inline-block mt-4 px-4 py-2 bg-[#101311] text-white text-xs font-bold uppercase"
              >
                Go to Copy Desk →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWords.map((word) => {
                const prog = progressMap[word.wordId];
                const tier = prog?.mastery_tier || 'new';
                const cooldownLeftMs = prog?.next_review_at
                  ? new Date(prog.next_review_at).getTime() - Date.now()
                  : 0;
                const onCooldown = cooldownLeftMs > 0;
                const minsLeft = Math.ceil(cooldownLeftMs / 60000);

                return (
                  <div
                    key={word.wordId}
                    className="p-4 bg-white border-2 border-[#101311] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-mono text-[10px] uppercase text-[#2C251E]">
                          {word.category} • {word.partOfSpeech}
                        </span>
                        <span
                          className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-[#101311] ${
                            tier === 'mastered'
                              ? 'bg-[#1E4D3B] text-white'
                              : tier === 'familiar'
                              ? 'bg-[#EAE2D0] text-[#101311]'
                              : 'bg-[#932A13] text-white'
                          }`}
                        >
                          {tier}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl font-black mt-1">{word.answer}</h3>
                      {word.phonetic && (
                        <p className="font-mono text-xs text-gray-500">{word.phonetic}</p>
                      )}
                      <p className="text-xs text-[#101311] mt-2 leading-relaxed">
                        {word.definition}
                      </p>
                      <p className="text-[11px] italic text-[#2C251E] mt-2 bg-[#F7F3EA] p-2 border-l-2 border-[#101311]">
                        "{word.example}"
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <button
                        disabled={onCooldown}
                        onClick={() => startQuickDrill(word)}
                        className={`w-full py-2 text-xs font-bold uppercase border-2 border-[#101311] flex items-center justify-center gap-1.5 ${
                          onCooldown
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-[#1E4D3B] text-[#F2EDE1] hover:bg-[#101311]'
                        }`}
                      >
                        {onCooldown ? (
                          <>
                            <Clock className="w-3.5 h-3.5" /> Cooldown ({minsLeft}m)
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Quick Practice Drill
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick Practice Drill Modal */}
      {drillWord && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[8px_8px_0px_#101311] p-6">
            <div className="flex justify-between items-center border-b-2 border-[#101311] pb-3">
              <span className="font-mono text-xs font-bold uppercase text-[#932A13]">
                Spaced-Repetition Verification
              </span>
              <button
                onClick={() => setDrillWord(null)}
                className="px-2 py-0.5 bg-[#101311] text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <h2 className="font-serif text-3xl font-black mt-3">{drillWord.answer}</h2>
            <p className="text-xs text-[#2C251E] mt-1 mb-4">
              Select the accurate editorial definition to advance mastery tier:
            </p>

            <div className="space-y-2">
              {drillOptions.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={Boolean(drillFeedback)}
                  onClick={() => handleDrillAnswer(opt)}
                  className="w-full p-3 text-left text-xs bg-white hover:bg-[#EAE2D0] border-2 border-[#101311] font-medium transition disabled:opacity-75"
                >
                  {opt}
                </button>
              ))}
            </div>

            {drillFeedback && (
              <div className="mt-4 p-3 bg-[#101311] text-[#F2EDE1] text-xs flex items-start gap-2">
                {drillFeedback.startsWith('Correct') ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{drillFeedback}</span>
              </div>
            )}

            {drillFeedback && (
              <button
                onClick={() => setDrillWord(null)}
                className="mt-4 w-full py-2.5 bg-[#932A13] text-white font-bold uppercase text-xs border-2 border-[#101311]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}