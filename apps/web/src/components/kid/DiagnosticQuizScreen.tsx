/**
 * DiagnosticQuizScreen
 *
 * A 5-question stealth placement quiz in "Explorer's Map" theme.
 * Shown after grade selection in ParentSetupScreen.
 *
 * Design principle (Dr. Escobar / academic research):
 *   Correct/incorrect signals are consumed ONLY by the backend (BKT seeding).
 *   The child sees a neutral "Got it!" acknowledgment — no green/red, no ✅/❌.
 *   This prevents assessment anxiety and avoids math identity labeling at ages 6–9.
 *
 * Flow:
 *   1. Load 5 diagnostic templates from /api/game/diagnostic-quiz
 *   2. Show one question at a time with A/B/C choices
 *   3. Neutral pulse acknowledgment (no correctness signal) → 800ms → next
 *   4. After 5 questions: call onComplete(score, suggestedGrade, results)
 *      where results contains { correct } for backend BKT seeding only
 */

import { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';
import {
  computeSuggestedGrade,
  evaluateAnswer,
  buildChoices,
  shouldComplete,
} from '../../services/diagnosticEngine';
import { useVidyaVoice } from '../../hooks/useVidyaVoice';

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

export function DiagnosticQuizScreen({ grade, subject = 'MATHEMATICS', onComplete, onSkip }: DiagnosticQuizScreenProps) {
  const { apiKey, calmMode, voiceEnabled, language } = useChatStore();
  const [templates, setTemplates] = useState<DiagnosticTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ conceptKey: string; gradeLevel: number; correct: boolean }>>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const { play: playVoice, isPlaying: voiceIsPlaying } = useVidyaVoice();

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
    () => current ? buildChoices(current.answerFormula, current.distractors) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIdx, templates]
  );

  // Read each question aloud when it changes (stealth assessment reduces reading confound)
  useEffect(() => {
    const q = templates[currentIdx];
    if (q && voiceEnabled) {
      playVoice(q.questionText, { tone: 'supportive', speed: 0.85, language, subject });
    }
  }, [currentIdx, voiceEnabled, templates]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = (choice: string) => {
    if (acknowledged || !current) return;
    setPicked(choice);
    setAcknowledged(true);

    // Evaluate answer for backend BKT — correctness never shown to child
    const result = evaluateAnswer(choice, current.answerFormula, current.conceptKey, current.gradeLevel);
    const newResults = [...results, result];
    setResults(newResults);

    setTimeout(() => {
      if (shouldComplete(currentIdx, templates.length)) {
        const score = newResults.filter((r) => r.correct).length;
        const suggestedGrade = computeSuggestedGrade(newResults, grade);
        onComplete(score, suggestedGrade, newResults);
      } else {
        setCurrentIdx((i) => i + 1);
        setPicked(null);
        setAcknowledged(false);
      }
    }, 800);
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

      {/* Progress map — neutral dots only, no correctness coloring */}
      <div className="flex gap-2 mb-6">
        {MAP_FRAGMENTS.map((frag, i) => (
          <div
            key={i}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-500',
              i < answeredCount
                ? 'bg-indigo-100 border-2 border-indigo-300 scale-105'
                : i === currentIdx
                ? cn('bg-indigo-100 border-2 border-indigo-400', !calmMode && 'animate-pulse')
                : 'bg-slate-100 border-2 border-slate-200 opacity-40'
            )}
          >
            {i < answeredCount ? '✦' : frag}
          </div>
        ))}
      </div>

      {/* Question card */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md mb-4 border border-slate-100 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-500 mb-1">Grade {current.gradeLevel} · {current.subject.replace('_', ' ')}</p>
        <p className="text-base font-medium text-slate-800 dark:text-white leading-snug">{current.questionText}</p>
        {voiceIsPlaying && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-400 shrink-0" aria-label="Reading aloud" />
          </div>
        )}
      </div>

      {/* Choices — neutral acknowledgment only, no correctness colors */}
      <div className="w-full flex flex-col gap-2">
        {choices.map((choice, i) => {
          const letter = ['A', 'B', 'C'][i];
          const isThisPicked = picked === choice;

          let style = 'border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';
          if (acknowledged) {
            if (isThisPicked) {
              // Neutral indigo "Got it!" pulse — no correctness signal
              style = 'border-indigo-400 bg-indigo-50 text-indigo-800';
            } else {
              style = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
            }
          }

          return (
            <button
              key={choice}
              onClick={() => handlePick(choice)}
              disabled={acknowledged}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 font-medium text-sm transition-all',
                style,
                !acknowledged && 'hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
              )}
            >
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                {letter}
              </span>
              <span className="flex-1 text-left">{choice}</span>
              {acknowledged && isThisPicked && (
                <span className="text-indigo-400 text-xs font-semibold">Got it!</span>
              )}
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
