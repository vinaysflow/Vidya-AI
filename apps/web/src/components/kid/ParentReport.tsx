import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, Award, Brain, ChevronRight, BookOpen, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import { getConceptMeta } from '../../data/conceptMeta';

const API_BASE = getApiBase();

interface Summary {
  conceptsMastered: number;
  conceptsAttempted: number;
  strongestTopic: string | null;
  weakestTopic: string | null;
  effectiveGrade: number | null;
  baseGrade: number | null;
  gradeLevelsUp: number;
  masteryGainLast7Days: number;
  aboveGradeConceptsCount: number;
  gradeUpHistory: { date: string; fromGrade: number; toGrade: number }[];
}

interface MasteredConcept {
  conceptKey: string;
  mastery: number;
}

export function ParentReport() {
  const { userId, apiKey, grade } = useChatStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [masteredConcepts, setMasteredConcepts] = useState<MasteredConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [gateHeld, setGateHeld] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    setHoldProgress(0);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdIntervalRef.current!);
          return 100;
        }
        return p + (100 / 30); // ~100ms * 30 = 3 seconds
      });
    }, 100);
    holdTimerRef.current = setTimeout(() => {
      setGateHeld(true);
    }, 3000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setHoldProgress(0);
  };

  useEffect(() => {
    if (!gateHeld || !userId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/progress/summary?userId=${encodeURIComponent(userId)}`, {
        headers: getJsonHeaders(apiKey),
      }).then(r => r.json()),
      fetch(`${API_BASE}/api/progress/mastery-by-concept?userId=${encodeURIComponent(userId)}`, {
        headers: getJsonHeaders(apiKey),
      }).then(r => r.json()),
    ])
      .then(([summaryData, masteryData]) => {
        if (summaryData.success) setSummary(summaryData.summary);
        if (masteryData.success && Array.isArray(masteryData.mastery)) {
          const mastered = (masteryData.mastery as MasteredConcept[])
            .filter((m) => m.mastery >= 40)
            .sort((a, b) => b.mastery - a.mastery)
            .slice(0, 6);
          setMasteredConcepts(mastered);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gateHeld, userId, apiKey]);

  if (!gateHeld) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Parent Report</h1>
          <p className="text-sm text-slate-400">Press and hold to verify you're a parent</p>
        </div>

        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          className="relative w-48 h-48 rounded-full bg-violet-100 dark:bg-violet-900/30 border-4 border-violet-300 dark:border-violet-700 flex items-center justify-center select-none overflow-hidden"
        >
          {holdProgress > 0 && (
            <div
              className="absolute inset-0 bg-violet-200 dark:bg-violet-800/50 transition-none"
              style={{ clipPath: `inset(${100 - holdProgress}% 0 0 0)` }}
            />
          )}
          <div className="relative z-10 text-center">
            <span className="block text-5xl mb-2">👨‍👩‍👧</span>
            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              {holdProgress > 0 ? `${Math.round(holdProgress)}%` : 'Hold for 3s'}
            </span>
          </div>
        </button>

        <Link to="/" className="mt-8 text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Vidya
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-400 text-sm">Loading your child's progress...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-6">
        <p className="text-slate-500 text-center mb-4">No learning data yet. Start a few sessions first!</p>
        <Link to="/" className="text-violet-500 font-semibold">Go learn something →</Link>
      </div>
    );
  }

  const masteryPercent = summary.conceptsAttempted > 0
    ? Math.round((summary.conceptsMastered / summary.conceptsAttempted) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Learning Report</h1>
          <p className="text-xs text-slate-400">Grade {grade ?? '?'} Student</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-400">Concepts Mastered</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{summary.conceptsMastered}</div>
          <div className="text-xs text-slate-400">of {summary.conceptsAttempted} attempted</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-400">Grade Level</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">
            {summary.effectiveGrade ?? grade ?? '?'}
          </div>
          {summary.gradeLevelsUp > 0 && (
            <div className="text-xs text-emerald-600 font-semibold">↑ {summary.gradeLevelsUp.toFixed(1)} levels up!</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mastery Progress</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-700"
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold text-violet-600">{masteryPercent}%</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          +{summary.masteryGainLast7Days.toFixed(0)} mastery points in the last 7 days
        </p>
      </div>

      {(summary.strongestTopic || summary.weakestTopic) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-4 space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Topic Insights</span>
          {summary.strongestTopic && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Strongest topic</span>
              <span className="text-xs font-bold text-emerald-600 capitalize">{summary.strongestTopic}</span>
            </div>
          )}
          {summary.weakestTopic && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Needs practice</span>
              <span className="text-xs font-bold text-amber-600 capitalize">{summary.weakestTopic}</span>
            </div>
          )}
        </div>
      )}

      {masteredConcepts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">What Your Child Has Learned</span>
          </div>
          <div className="space-y-2">
            {masteredConcepts.map((concept) => {
              const meta = getConceptMeta(concept.conceptKey);
              return (
                <div key={concept.conceptKey} className="flex gap-3 items-start">
                  {meta && (
                    <span className="text-xl shrink-0 mt-0.5">{meta.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">
                      {concept.conceptKey.replace(/_/g, ' ')}
                    </p>
                    {meta?.parentExplanation ? (
                      <p className="text-xs text-slate-500 leading-snug">{meta.parentExplanation}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">A key concept your child has been practicing</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-600">{Math.round(concept.mastery)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BenchmarkCard summary={summary} />
    </div>
  );
}

// -------------------------------------------------------
// Benchmark Card — contextualises adaptive grade vs enrolled grade
// -------------------------------------------------------
function BenchmarkCard({ summary }: { summary: Summary }) {
  const { gradeLevelsUp, effectiveGrade, baseGrade, conceptsMastered, aboveGradeConceptsCount, gradeUpHistory } = summary;

  type BenchmarkTier = {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    headline: string;
    body: string;
  };

  const tier: BenchmarkTier = (() => {
    if (gradeLevelsUp >= 3) {
      return {
        label: 'Highly Gifted',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-700',
        icon: <Star className="w-5 h-5 text-purple-500" />,
        headline: `Performing ${gradeLevelsUp} grade levels above enrollment`,
        body: `Your child enrolled in Grade ${baseGrade} and is now mastering Grade ${effectiveGrade?.toFixed(0)} content — consistently working ${gradeLevelsUp}+ years ahead of their peers. This level of acceleration is observed in fewer than 2% of learners at this age.`,
      };
    }
    if (gradeLevelsUp >= 2) {
      return {
        label: 'Gifted Range',
        color: 'text-indigo-700 dark:text-indigo-300',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        borderColor: 'border-indigo-200 dark:border-indigo-700',
        icon: <Zap className="w-5 h-5 text-indigo-500" />,
        headline: `Performing ${gradeLevelsUp} grade levels above enrollment`,
        body: `Your child enrolled in Grade ${baseGrade} and is now mastering Grade ${effectiveGrade?.toFixed(0)} content. Children performing 2+ grade levels above their enrolled grade represent the top ~5% of learners at this age (based on typical grade-level norms). Vidya's adaptive engine confirmed this through ${conceptsMastered} mastered concepts.`,
      };
    }
    if (gradeLevelsUp === 1) {
      return {
        label: 'Advanced',
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-700',
        icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
        headline: 'Performing 1 grade level above enrollment',
        body: `Your child enrolled in Grade ${baseGrade} and is consistently working through Grade ${effectiveGrade?.toFixed(0)} content. They are ahead of grade-level expectations and making strong progress.`,
      };
    }
    return {
      label: 'On Track',
      color: 'text-violet-700 dark:text-violet-300',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      borderColor: 'border-violet-100 dark:border-violet-800',
      icon: <Brain className="w-5 h-5 text-violet-500" />,
      headline: `Working solidly at Grade ${baseGrade ?? effectiveGrade} content`,
      body: `Your child is building strong foundations at their enrolled grade level. Consistent practice will help them advance.`,
    };
  })();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`rounded-2xl p-4 border ${tier.bgColor} ${tier.borderColor} mb-4`}>
      {/* Tier badge + headline */}
      <div className="flex items-center gap-2 mb-2">
        {tier.icon}
        <span className={`text-xs font-bold uppercase tracking-wide ${tier.color}`}>{tier.label}</span>
        {gradeLevelsUp >= 2 && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${tier.bgColor} ${tier.color} border ${tier.borderColor}`}>
            Grade {effectiveGrade?.toFixed(0)} content
          </span>
        )}
      </div>
      <p className={`text-sm font-semibold ${tier.color} mb-1`}>{tier.headline}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tier.body}</p>

      {/* Above-grade concepts stat */}
      {aboveGradeConceptsCount > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-white/60 dark:bg-slate-800/40 rounded-xl px-3 py-2">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            <strong className="text-slate-800 dark:text-white">{aboveGradeConceptsCount}</strong> concept{aboveGradeConceptsCount !== 1 ? 's' : ''} mastered above enrolled grade level
          </span>
        </div>
      )}

      {/* Grade-up timeline */}
      {gradeUpHistory.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Grade level progression</p>
          <div className="space-y-1">
            {gradeUpHistory.map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-mono text-slate-400 dark:text-slate-500 w-14 shrink-0">{formatDate(event.date)}</span>
                <span className="font-semibold">Grade {event.fromGrade}</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className={`font-bold ${tier.color}`}>Grade {event.toGrade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrichment nudge for gifted range */}
      {gradeLevelsUp >= 2 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
          Consider discussing enrichment programs or advanced coursework with their school.
        </p>
      )}

      <Link
        to="/"
        className={`mt-3 flex items-center gap-1 text-xs font-semibold ${tier.color}`}
      >
        Continue learning <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
