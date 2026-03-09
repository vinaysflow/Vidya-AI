import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Beaker, Calculator, Leaf, Code2, BookMarked,
  TrendingUp, PenLine, Heart, Sparkles, BrainCircuit,
  ChevronRight, ChevronDown, Map as MapIcon, Shield, RefreshCw,
} from 'lucide-react';
import { MasteryTree } from '../progress/MasteryTree';
import { cn } from '../../lib/utils';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import {
  useChatStore,
  useIsKidMode,
  SUBJECT_META,
  CATEGORY_LABELS,
  type Subject,
  type SubjectCategory,
} from '../../stores/chatStore';
import { getConceptMeta } from '../../data/conceptMeta';
import { recommendQuests } from '../../services/questRecommender';

import questsData from '../../data/quests.json';

interface Quest {
  id: string;
  title: string;
  prompt: string;
  subject: Subject;
  topic: string;
  conceptKey: string;
  prerequisites: string[];
  tags: string[];
  chapter?: string;
  order?: number;
  gradeLevel?: number;
  context?: string;
}

const SOFT_THRESHOLD = 40;


function sortQuests(
  quests: Quest[],
  masteryMap: Array<{ conceptKey: string; mastery: number }> | null
): { ready: Quest[]; challenge: Quest[] } {
  const masteryByKey = new Map(masteryMap?.map((m) => [m.conceptKey, m.mastery]) ?? []);
  const ready: Quest[] = [];
  const challenge: Quest[] = [];
  for (const q of quests) {
    const prereqsMet =
      !q.prerequisites?.length ||
      q.prerequisites.every((key) => (masteryByKey.get(key) ?? 0) >= SOFT_THRESHOLD);
    (prereqsMet ? ready : challenge).push(q);
  }
  return { ready, challenge };
}

const CHAPTER_ORDER = [
  'Minecraft Builder',
  'Kitchen Scientist',
  'Playground Lab',
  'Pattern Detective',
  'Nature Explorer',
  'Logic Detective',
  'Body Detective',
  'Code Architect',
  'Story Detective',
  'Money Master',
  'Robot Trainer',
  'Puzzle Palace',
  'Space Explorer',
  'Ecosystem Explorer',
  'Algorithm Arena',
  'Word Wizard',
  'Market Explorer',
  'AI Lab',
  'Cell Lab',
  'Debug Quest',
  'Story Crafter',
  'Poetry Explorer',
  'Dragon Academy',
  'Ocean Discovery',
  'Enchanted Forest',
  'Planet Patrol',
  'Weather Watcher',
  'Genetics Lab',
  'Bug Hunter',
  'Data Detective',
  'Bias Detective',
  'Argument Builder',
  'Market Maker',
  'Adventures',
];

function groupQuestsByChapter(ready: Quest[], challenge: Quest[]): Array<{ chapter: string; ready: Quest[]; challenge: Quest[] }> {
  const getChapter = (q: Quest) => q.chapter || 'Adventures';
  const byChapter = new Map<string, { ready: Quest[]; challenge: Quest[] }>();

  const add = (q: Quest, list: 'ready' | 'challenge') => {
    const ch = getChapter(q);
    if (!byChapter.has(ch)) byChapter.set(ch, { ready: [], challenge: [] });
    byChapter.get(ch)![list].push(q);
  };

  ready.forEach((q) => add(q, 'ready'));
  challenge.forEach((q) => add(q, 'challenge'));

  const sortByOrder = (a: Quest, b: Quest) => (a.order ?? 999) - (b.order ?? 999);
  byChapter.forEach((v) => {
    v.ready.sort(sortByOrder);
    v.challenge.sort(sortByOrder);
  });

  const order = CHAPTER_ORDER.filter((ch) => byChapter.has(ch));
  const rest = Array.from(byChapter.keys()).filter((ch) => !CHAPTER_ORDER.includes(ch)).sort();
  return [...order, ...rest].map((ch) => ({
    chapter: ch,
    ready: byChapter.get(ch)!.ready,
    challenge: byChapter.get(ch)!.challenge,
  }));
}

interface WelcomeScreenProps {
  onStarterClick: (text: string, subject?: Subject, conceptKey?: string) => void;
}

const CHAPTER_THEMES: Record<string, { dot: string; emoji: string; label: string }> = {
  'Minecraft Builder': { dot: 'bg-emerald-500', emoji: '⛏️', label: 'Minecraft Builder' },
  'Kitchen Scientist': { dot: 'bg-orange-400', emoji: '🧪', label: 'Kitchen Scientist' },
  'Playground Lab':    { dot: 'bg-sky-400',    emoji: '🎢', label: 'Playground Lab' },
  'Pattern Detective': { dot: 'bg-violet-500', emoji: '🔍', label: 'Pattern Detective' },
  'Nature Explorer':   { dot: 'bg-lime-500',   emoji: '🌿', label: 'Nature Explorer' },
  'Logic Detective':   { dot: 'bg-rose-500',   emoji: '🧠', label: 'Logic Detective' },
  'Body Detective':    { dot: 'bg-red-500',    emoji: '🫀', label: 'Body Detective' },
  'Code Architect':    { dot: 'bg-cyan-500',   emoji: '💻', label: 'Code Architect' },
  'Story Detective':   { dot: 'bg-pink-500',   emoji: '📚', label: 'Story Detective' },
  'Money Master':      { dot: 'bg-yellow-500', emoji: '💰', label: 'Money Master' },
  'Robot Trainer':     { dot: 'bg-violet-600', emoji: '🤖', label: 'Robot Trainer' },
  'Puzzle Palace':     { dot: 'bg-teal-500',   emoji: '🧩', label: 'Puzzle Palace' },
  'Space Explorer':    { dot: 'bg-indigo-500', emoji: '🚀', label: 'Space Explorer' },
  'Ecosystem Explorer':{ dot: 'bg-teal-600',   emoji: '🌱', label: 'Ecosystem Explorer' },
  'Algorithm Arena':   { dot: 'bg-blue-500',   emoji: '⚙️', label: 'Algorithm Arena' },
  'Word Wizard':       { dot: 'bg-purple-500', emoji: '📖', label: 'Word Wizard' },
  'Market Explorer':   { dot: 'bg-green-500',  emoji: '📈', label: 'Market Explorer' },
  'AI Lab':            { dot: 'bg-indigo-400', emoji: '🧠', label: 'AI Lab' },
  'Cell Lab':          { dot: 'bg-lime-600',   emoji: '🔬', label: 'Cell Lab' },
  'Debug Quest':       { dot: 'bg-orange-500', emoji: '🐛', label: 'Debug Quest' },
  'Story Crafter':     { dot: 'bg-rose-400',   emoji: '✍️', label: 'Story Crafter' },
  'Poetry Explorer':   { dot: 'bg-fuchsia-500',emoji: '🎭', label: 'Poetry Explorer' },
  'Dragon Academy':    { dot: 'bg-red-600',    emoji: '🐉', label: 'Dragon Academy' },
  'Ocean Discovery':   { dot: 'bg-cyan-600',   emoji: '🌊', label: 'Ocean Discovery' },
  'Enchanted Forest':  { dot: 'bg-emerald-700',emoji: '🌲', label: 'Enchanted Forest' },
  'Planet Patrol':     { dot: 'bg-blue-700',   emoji: '🪐', label: 'Planet Patrol' },
  'Weather Watcher':   { dot: 'bg-sky-500',    emoji: '⛅', label: 'Weather Watcher' },
  'Genetics Lab':      { dot: 'bg-violet-400', emoji: '🧬', label: 'Genetics Lab' },
  'Bug Hunter':        { dot: 'bg-yellow-600', emoji: '🐛', label: 'Bug Hunter' },
  'Data Detective':    { dot: 'bg-blue-600',   emoji: '📊', label: 'Data Detective' },
  'Bias Detective':    { dot: 'bg-amber-500',  emoji: '🔎', label: 'Bias Detective' },
  'Argument Builder':  { dot: 'bg-orange-600', emoji: '🗣️', label: 'Argument Builder' },
  'Market Maker':      { dot: 'bg-teal-400',   emoji: '🏪', label: 'Market Maker' },
  Adventures:          { dot: 'bg-amber-400',  emoji: '✨', label: 'Adventures' },
};

const SUBJECT_ICONS: Record<Subject, typeof BookOpen> = {
  PHYSICS: BookOpen,
  CHEMISTRY: Beaker,
  MATHEMATICS: Calculator,
  BIOLOGY: Leaf,
  CODING: Code2,
  AI_LEARNING: BrainCircuit,
  ENGLISH_LITERATURE: BookMarked,
  ECONOMICS: TrendingUp,
  ESSAY_WRITING: PenLine,
  COUNSELING: Heart,
  LOGIC: BrainCircuit,
};

const STARTER_PROMPTS: Partial<Record<Subject, Record<string, string[]>>> = {
  PHYSICS: {
    EN: ["A ball is thrown upward at 20 m/s. Find the maximum height.", "Explain the difference between distance and displacement."],
    HI: ["एक गेंद को 20 m/s से ऊपर फेंका गया। अधिकतम ऊंचाई ज्ञात करें।", "दूरी और विस्थापन में क्या अंतर है?"],
    FR: ["Une balle est lancee vers le haut a 20 m/s. Trouvez la hauteur maximale.", "Expliquez la difference entre distance et deplacement."],
    DE: ["Ein Ball wird mit 20 m/s nach oben geworfen. Finde die maximale Hoehe.", "Erklaere den Unterschied zwischen Strecke und Verschiebung."],
    ES: ["Una pelota se lanza hacia arriba a 20 m/s. Halla la altura maxima.", "Explica la diferencia entre distancia y desplazamiento."],
    ZH: ["一个球以 20 m/s 的速度向上抛出，求最大高度。", "解释距离和位移的区别。"],
  },
  CHEMISTRY: {
    EN: ["How do you calculate the molarity of a solution?", "What's the difference between ionic and covalent bonding?"],
  },
  MATHEMATICS: {
    EN: ["How do I solve a quadratic equation by factoring?", "What is the derivative of x^2 * sin(x)?"],
  },
  BIOLOGY: {
    EN: ["What is the difference between mitosis and meiosis?", "How does the human respiratory system exchange gases?"],
  },
  CODING: {
    EN: ["Find two numbers in an array that add up to a target sum.", "What's the difference between a stack and a queue?"],
  },
  ENGLISH_LITERATURE: {
    EN: ["What does the green light symbolize in The Great Gatsby?", "How does the author use irony in this passage?"],
  },
  ECONOMICS: {
    EN: ["What happens to price when demand increases but supply stays the same?", "Explain the concept of opportunity cost with an example."],
  },
  AI_LEARNING: {
    EN: ["What's the difference between classification and regression?", "How does a computer learn to recognize faces?"],
  },
  ESSAY_WRITING: {
    EN: ["Help me brainstorm ideas for my Common App essay about resilience."],
  },
  COUNSELING: {
    EN: ["I'm confused about choosing between engineering and medicine."],
  },
};

export function WelcomeScreen({ onStarterClick }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const { language, subject, masteryMap, setSubject, setQuestConceptKey, setActiveQuest, setGrade, userId, effectiveGrade, grade, rsmTrack, setEssayMeta, essayMeta, interests } = useChatStore();
  const isKidMode = useIsKidMode();
  const displayGrade = effectiveGrade ?? grade ?? 3;
  const [showMap, setShowMap] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() =>
    // In kid mode: start all chapters collapsed (recommender cards are the entry point)
    // In non-kid mode: expand the first chapter for discoverability
    isKidMode ? new Set<string>() : new Set([CHAPTER_ORDER[0]])
  );
  const [showEssayPicker, setShowEssayPicker] = useState(false);

  // Review Adventure state
  const [reviewQuest, setReviewQuest] = useState<Quest | null>(null);
  const [dueReviewCount, setDueReviewCount] = useState(0);
  useEffect(() => {
    if (!isKidMode || !userId) return;
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/game/review-quest?userId=${encodeURIComponent(userId)}`, {
      headers: getJsonHeaders(null),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.hasDueReviews && d.quest) {
          setReviewQuest(d.quest as Quest);
          setDueReviewCount(d.dueCount ?? 1);
        }
      })
      .catch(() => {});
  }, [isKidMode, userId]);
  const toggleChapter = (ch: string) =>
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });

  const quests = useMemo(() => {
    const all = questsData as Quest[];
    // Filter to grade range: base grade up to effectiveGrade + 1
    const baseGrade = grade ?? 3;
    const maxGrade = (effectiveGrade ?? baseGrade) + 1;

    return all.filter((q) => {
      // In kid mode: remove subject lock — recommender handles subject diversity
      // In non-kid mode: respect the selected subject filter
      if (!isKidMode && q.subject && subject && q.subject !== subject) return false;
      if (q.gradeLevel != null && q.gradeLevel > maxGrade) return false;
      return true;
    });
  }, [subject, grade, effectiveGrade, isKidMode]);

  // Top 3 recommended quests for kid-mode "Recommended for you" section
  const recommendedQuests = useMemo(() => {
    if (!isKidMode) return [];
    return recommendQuests({
      quests: quests as import('../../services/questRecommender').Quest[],
      masteryMap,
      recentSubjects: [],
      grade: grade ?? 3,
      effectiveGrade: effectiveGrade ?? grade ?? 3,
      interests: interests ?? [],
      topN: 3,
    });
  }, [quests, masteryMap, grade, effectiveGrade, interests, isKidMode]);
  const questByConceptKey = useMemo(() => {
    const m = new Map<string, Quest>();
    for (const q of quests) m.set(q.conceptKey, q);
    return m;
  }, [quests]);
  const { ready, challenge } = useMemo(
    () => sortQuests(quests, masteryMap),
    [quests, masteryMap]
  );
  const chapters = useMemo(
    () => groupQuestsByChapter(ready, challenge),
    [ready, challenge]
  );

  if (isKidMode && quests.length > 0) {
    return (
      <div className="flex flex-col py-6 px-4 max-w-lg mx-auto w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-800">
            Pick an adventure
          </h1>
          {rsmTrack && (
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold tracking-wide">
              RSM
            </span>
          )}
        </div>
        {/* Challenge level indicator */}
        {displayGrade > (grade ?? 3) && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(displayGrade - (grade ?? 3), 4) + 1 }, (_, i) => (
                <span key={i} className="text-amber-400 text-sm leading-none">★</span>
              ))}
            </div>
            <span className="text-xs font-bold text-amber-500">
              Challenge Level {displayGrade - (grade ?? 3) + 1}
            </span>
          </div>
        )}
        <p className="text-sm text-slate-400 mb-2">
          Choose a quest to start playing
        </p>
        <button
          onClick={() => setGrade(null)}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-500 transition-colors mb-5 self-start"
          data-testid="parent-settings-btn"
        >
          <Shield className="w-3 h-3" />
          Parent Settings
        </button>

        {/* Review Adventure card — shown when there are due reviews */}
        {reviewQuest && (
          <div className="mb-4">
            <button
              onClick={() => {
                setQuestConceptKey(reviewQuest.conceptKey);
                setActiveQuest({ ...reviewQuest, chapter: reviewQuest.chapter ?? 'Review Adventure' });
                onStarterClick(reviewQuest.prompt, reviewQuest.subject as Subject, reviewQuest.conceptKey);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-0.5">
                  Review Adventure {dueReviewCount > 1 ? `· ${dueReviewCount} due` : ''}
                </p>
                <p className="text-sm font-semibold text-slate-700 line-clamp-1">
                  {reviewQuest.title}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          </div>
        )}

        {/* Chapter groups */}
        <div className="space-y-4">
          {/* Recommended for you — top 3 engine-scored quests */}
          {recommendedQuests.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
                ✨ Recommended for you
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {recommendedQuests.map((q) => {
                  const theme = CHAPTER_THEMES[(q as Quest).chapter ?? ''] ?? CHAPTER_THEMES.Adventures;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setQuestConceptKey(q.conceptKey);
                        setActiveQuest({
                          id: q.id,
                          title: q.title,
                          chapter: (q as Quest).chapter || 'Adventures',
                          tags: (q as Quest).tags || [],
                          prompt: q.prompt,
                          gradeLevel: (q as Quest).gradeLevel,
                          context: (q as Quest).context,
                        });
                        onStarterClick(q.prompt, q.subject as Subject, q.conceptKey);
                      }}
                      className="flex-shrink-0 w-36 flex flex-col gap-2 p-3 rounded-2xl border-2 border-indigo-100 bg-white shadow-sm hover:border-indigo-300 hover:bg-indigo-50 active:scale-95 transition-all text-left"
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-base', theme.dot, 'bg-opacity-20')}>
                        {theme.emoji}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-snug">
                        {q.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {(q as Quest).chapter ?? q.subject}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All adventures — collapsed chapter accordion */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            All adventures
          </p>
          {chapters.map(({ chapter, ready: r, challenge: c }) => {
            const theme = CHAPTER_THEMES[chapter] ?? CHAPTER_THEMES.Adventures;
            const allQuests = [...r, ...c];
            const isOpen = expandedChapters.has(chapter);

            // When RSM mode is on, float RSM-tagged quests to the top
            const sortedQuests = rsmTrack
              ? [
                  ...allQuests.filter((q) => q.tags?.includes('rsm')),
                  ...allQuests.filter((q) => !q.tags?.includes('rsm')),
                ]
              : allQuests;

            const questCount = allQuests.length;

            return (
              <div key={chapter}>
                {/* Accordion chapter heading */}
                <button
                  onClick={() => toggleChapter(chapter)}
                  className="w-full flex items-center gap-2 mb-0 py-2 text-left"
                  data-testid="chapter-header"
                  aria-expanded={isOpen}
                >
                  <span className={cn('w-2 h-2 rounded-full shrink-0', theme.dot)} />
                  <span className="flex-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                    {theme.emoji} {chapter}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-300 mr-1">
                    {questCount}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  }
                </button>

                {/* Quest rows — collapsed by default, show first 3 (expanded shows all) */}
                {isOpen && (
                  <div className="space-y-2 mt-2">
                    {sortedQuests.map((q, idx) => {
                      const isPrereqReady = r.includes(q);
                      const isGradeLocked = q.gradeLevel != null && q.gradeLevel > displayGrade;
                      const isReady = isPrereqReady && !isGradeLocked;
                      const isBossQuest = q.gradeLevel != null && q.gradeLevel >= (grade ?? 3) + 2;
                      const meta = getConceptMeta(q.conceptKey);
                      const masteryScore = masteryMap?.find((m) => m.conceptKey === q.conceptKey)?.mastery ?? 0;
                      const isCompleted = masteryScore >= 80;
                      const isRsm = q.tags?.includes('rsm');
                      const isDimmed = rsmTrack && !isRsm;

                      return (
                        <button
                          key={q.id}
                          data-testid={`quest-card-${q.id}`}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          onClick={() => {
                            if (isGradeLocked) return;
                            setQuestConceptKey(q.conceptKey);
                            setActiveQuest({
                              id: q.id,
                              title: q.title,
                              chapter: q.chapter || 'Adventures',
                              tags: q.tags || [],
                              prompt: q.prompt,
                              gradeLevel: q.gradeLevel,
                              context: q.context,
                            });
                            onStarterClick(q.prompt, q.subject, q.conceptKey);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3.5',
                            'bg-white rounded-2xl border border-slate-100 shadow-sm',
                            'text-left transition-all active:scale-[0.98]',
                            'animate-[slideUp_0.3s_ease-out_both]',
                            isGradeLocked
                              ? 'opacity-40 cursor-not-allowed'
                              : isDimmed
                              ? 'opacity-40'
                              : isReady
                              ? 'hover:border-slate-200 hover:shadow-md hover:scale-[1.01]'
                              : 'opacity-60'
                          )}
                        >
                          {/* Emoji in a soft circle */}
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-xl shrink-0">
                            {isCompleted ? '⭐' : isGradeLocked ? '🔒' : meta.emoji}
                          </div>

                          {/* Title + optional boss badge */}
                          <span className={cn(
                            'flex-1 text-sm font-semibold leading-snug',
                            isGradeLocked ? 'text-slate-300' : isReady ? 'text-slate-800' : 'text-slate-500'
                          )}>
                            {q.title}
                            {isBossQuest && !isGradeLocked && (
                              <span className="ml-2 text-xs font-bold text-amber-500">⭐ Challenge</span>
                            )}
                            {/* Pulsing dot for freshly unlocked quests */}
                            {!isGradeLocked && q.gradeLevel === displayGrade && displayGrade > (grade ?? 3) && !isCompleted && (
                              <span className="ml-1 relative flex h-2 w-2 inline-flex">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                            )}
                          </span>

                          {/* RSM badge */}
                          {isRsm && !isGradeLocked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 shrink-0">
                              RSM
                            </span>
                          )}

                          {/* Chevron or grade lock label */}
                          {isGradeLocked ? (
                            <span className="text-[10px] font-semibold text-slate-300 shrink-0">
                              Gr. {q.gradeLevel}
                            </span>
                          ) : isReady ? (
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Adventure Map toggle */}
        <button
          onClick={() => setShowMap((s) => !s)}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MapIcon className="w-4 h-4" />
          My Adventure Map
        </button>

        {showMap && (
          <div className="mt-3 w-full rounded-2xl border border-slate-100 bg-white p-4 max-h-80 overflow-y-auto shadow-sm">
            <MasteryTree
              subject={subject}
              userId={userId || 'anonymous'}
              isKidMode
              onConceptClick={(conceptName, conceptKey) => {
                const quest = conceptKey ? questByConceptKey.get(conceptKey) : undefined;
                if (quest) {
                  setQuestConceptKey(quest.conceptKey);
                  setActiveQuest({
                    id: quest.id,
                    title: quest.title,
                    chapter: quest.chapter || 'Adventures',
                    tags: quest.tags || [],
                    prompt: quest.prompt,
                    context: quest.context,
                  });
                  onStarterClick(quest.prompt, quest.subject, quest.conceptKey);
                } else {
                  onStarterClick(`Help me learn about ${conceptName}!`, subject);
                }
                setShowMap(false);
              }}
            />
          </div>
        )}

        <p className="text-xs text-slate-300 mt-6 text-center">
          You can try any quest — Vidya will help you think it through
        </p>

        {/* Parent access — subtle, below all content */}
        <a
          href="/parent-report"
          className="mt-4 text-xs text-slate-300 hover:text-slate-500 transition-colors text-center flex items-center justify-center gap-1"
        >
          <Shield className="w-3 h-3" />
          Parent? View Learning Report
        </a>
      </div>
    );
  }

  const categories: SubjectCategory[] = ['stem', 'humanities', 'skills'];
  const prompts = STARTER_PROMPTS[subject]?.[language]
    || STARTER_PROMPTS[subject]?.EN
    || STARTER_PROMPTS.PHYSICS?.EN
    || [];

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('app.name')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{t('app.tagline')}</p>
        </div>
      </div>

      <div className="w-full mt-6 space-y-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700/70 p-4 shadow-sm backdrop-blur-sm">
        {categories.map((cat) => {
          const subjects = SUBJECT_META.filter((s) => s.category === cat && !s.comingSoon);
          return (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                {CATEGORY_LABELS[cat][language] || CATEGORY_LABELS[cat].EN}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {subjects.map((s) => {
                  const Icon = SUBJECT_ICONS[s.id];
                  const isActive = subject === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSubject(s.id);
                        if (s.id === 'ESSAY_WRITING') setShowEssayPicker(true);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border-2',
                        isActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md shadow-blue-500/10'
                          : 'border-transparent bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br', s.color, isActive ? 'shadow-lg' : 'opacity-80')}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className={cn('text-xs font-medium text-center leading-tight', isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400')}>
                        {s.label[language] || s.label.EN}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {prompts.length > 0 && (
        <div className="w-full mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
            {language === 'HI' ? 'शुरू करें' : language === 'ZH' ? '快速开始' : 'Try asking'}
          </h3>
          <div className="space-y-2">
            {prompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onStarterClick(prompt)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl transition-all',
                  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                  'hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md',
                  'text-sm text-slate-700 dark:text-slate-300'
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
        Ask anything — Vid (Vidya) teaches through Socratic questioning
      </p>

      {/* Essay prompt picker modal */}
      {showEssayPicker && subject === 'ESSAY_WRITING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Essay Setup</h2>
            <p className="text-xs text-slate-400 mb-4">Help Vidya coach you better</p>

            <label className="block text-xs font-semibold text-slate-500 mb-1">Essay Category</label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {['Why Us', 'Identity', 'Challenge', 'Intellectual', 'Activity', 'Community', 'Diversity', 'Growth', 'Creative'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setEssayMeta({ ...(essayMeta ?? {}), category: cat })}
                  className={cn(
                    'py-1.5 rounded-xl border text-xs font-medium transition-all',
                    essayMeta?.category === cat
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-500 mb-1">Word Limit (optional)</label>
            <div className="flex gap-2 mb-4">
              {[250, 500, 650].map(wl => (
                <button
                  key={wl}
                  onClick={() => setEssayMeta({ ...(essayMeta ?? {}), wordLimit: wl })}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl border text-xs font-medium transition-all',
                    essayMeta?.wordLimit === wl
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500'
                  )}
                >
                  {wl}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-500 mb-1">School prompt (optional)</label>
            <textarea
              placeholder="Paste the prompt from the school..."
              value={essayMeta?.promptText ?? ''}
              onChange={e => setEssayMeta({ ...(essayMeta ?? {}), promptText: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 resize-none mb-4"
              rows={3}
            />

            <button
              onClick={() => setShowEssayPicker(false)}
              className="w-full py-2.5 rounded-xl bg-violet-500 text-white font-bold text-sm hover:bg-violet-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
