/**
 * DiagnosticQuizScreen
 *
 * A 5-question placement quiz in "Explorer's Map" theme.
 * Shown after grade selection in ParentSetupScreen.
 * Results are used to calibrate BKT initial priors and suggest an effectiveGrade.
 *
 * Flow:
 *   1. Load 5 diagnostic templates from /api/game/diagnostic-quiz
 *   2. Show one question at a time with A/B/C choices
 *   3. Reveal correct/wrong with a brief map-reveal animation
 *   4. After 5 questions: show summary + call onComplete(score, suggestedGrade)
 */

import { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, CheckCircle, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';

const API_BASE = getApiBase();

interface DiagnosticTemplate {
  id: string;
  conceptKey: string;
  gradeLevel: number;
  subject: string;
  questionText: string;
  answerFormula: string;
  distractors: string[];
}

interface DiagnosticQuizScreenProps {
  grade: number;
  subject?: string;
  onComplete: (score: number, suggestedGrade: number, results: Array<{ conceptKey: string; gradeLevel: number; correct: boolean }>) => void;
  onSkip: () => void;
}

const MAP_FRAGMENTS = ['🗺️', '🌄', '🏔️', '🌊', '⭐'];

function computeSuggestedGrade(results: Array<{ gradeLevel: number; correct: boolean }>, baseGrade: number): number {
  const correct = results.filter((r) => r.correct);
  if (correct.length === 0) return Math.max(3, baseGrade - 1);
  if (correct.length <= 2) return baseGrade;
  const avgCorrectGrade = correct.reduce((s, r) => s + r.gradeLevel, 0) / correct.length;
  return Math.round(Math.min(9, Math.max(3, avgCorrectGrade)));
}

export function DiagnosticQuizScreen({ grade, subject = 'MATHEMATICS', onComplete, onSkip }: DiagnosticQuizScreenProps) {
  const { apiKey, calmMode } = useChatStore();
  const [templates, setTemplates] = useState<DiagnosticTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ conceptKey: string; gradeLevel: number; correct: boolean }>>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/game/diagnostic-quiz?grade=${grade}&subject=${subject}`, {
      headers: getJsonHeaders(apiKey),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.quiz?.length > 0) {
          setTemplates(d.quiz);
        } else {
          setError('No quiz available for this subject. Skipping...');
          setTimeout(onSkip, 1500);
        }
      })
      .catch(() => {
        setError('Could not load quiz. Skipping...');
        setTimeout(onSkip, 1500);
      })
      .finally(() => setLoading(false));
  }, [grade, subject, apiKey, onSkip]);

  const current = templates[currentIdx];

  // Must be declared before any early returns — Rules of Hooks
  const choices = useMemo(
    () => current
      ? [current.answerFormula, ...current.distractors].sort(() => Math.random() - 0.5)
      : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIdx, templates]
  );

  const handlePick = (choice: string) => {
    if (revealed || !current) return;
    setPicked(choice);
    setRevealed(true);

    const isCorrect = choice === current.answerFormula;
    const newResults = [...results, { conceptKey: current.conceptKey, gradeLevel: current.gradeLevel, correct: isCorrect }];
    setResults(newResults);

    setTimeout(() => {
      if (currentIdx + 1 >= templates.length) {
        const score = newResults.filter((r) => r.correct).length;
        const suggestedGrade = computeSuggestedGrade(newResults, grade);
        onComplete(score, suggestedGrade, newResults);
      } else {
        setCurrentIdx((i) => i + 1);
        setPicked(null);
        setRevealed(false);
      }
    }, 1400);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading your placement quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!current) return null;

  const answeredCount = results.length;

  return (
    <div className="flex flex-col items-center px-4 py-6 max-w-md mx-auto min-h-[70vh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 self-start">
        <MapIcon className="w-5 h-5 text-indigo-500" />
        <span className="text-sm font-bold text-indigo-600">Explorer's Map</span>
        <span className="text-xs text-slate-400 ml-auto">
          Question {currentIdx + 1} of {templates.length}
        </span>
      </div>

      {/* Map progress */}
      <div className="flex gap-2 mb-6">
        {MAP_FRAGMENTS.map((frag, i) => (
          <div
            key={i}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-500',
              i < answeredCount
                ? results[i]?.correct
                  ? 'bg-emerald-100 border-2 border-emerald-400 scale-110'
                  : 'bg-red-100 border-2 border-red-300 opacity-60'
                : i === currentIdx
                ? cn('bg-indigo-100 border-2 border-indigo-400', !calmMode && 'animate-pulse')
                : 'bg-slate-100 border-2 border-slate-200 opacity-40'
            )}
          >
            {i < answeredCount ? (results[i]?.correct ? '✅' : '❌') : frag}
          </div>
        ))}
      </div>

      {/* Question card */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md mb-4 border border-slate-100 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-500 mb-1">Grade {current.gradeLevel} · {current.subject.replace('_', ' ')}</p>
        <p className="text-base font-medium text-slate-800 dark:text-white leading-snug">{current.questionText}</p>
      </div>

      {/* Choices */}
      <div className="w-full flex flex-col gap-2">
        {choices.map((choice, i) => {
          const letter = ['A', 'B', 'C'][i];
          const isCorrect = choice === current.answerFormula;
          const isPicked = picked === choice;

          let style = 'border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';
          if (revealed) {
            if (isCorrect) style = 'border-emerald-400 bg-emerald-50 text-emerald-800';
            else if (isPicked) style = 'border-red-300 bg-red-50 text-red-700';
            else style = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
          }

          return (
            <button
              key={choice}
              onClick={() => handlePick(choice)}
              disabled={revealed}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 font-medium text-sm transition-all',
                style,
                !revealed && 'hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
              )}
            >
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                {letter}
              </span>
              <span className="flex-1 text-left">{choice}</span>
              {revealed && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
              {revealed && isPicked && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="mt-6 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
      >
        Skip placement quiz <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
