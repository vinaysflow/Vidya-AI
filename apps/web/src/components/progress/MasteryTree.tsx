import { useEffect, useState } from 'react';
import { Lock, CheckCircle, Circle, Star } from 'lucide-react';
import type { Subject } from '../../stores/chatStore';
import { getApiBase, getAuthHeader } from '../../lib/api';

const API_BASE = getApiBase();

interface PathStep {
  conceptKey: string | null;
  name: string;
  topic: string;
  status: 'mastered' | 'available' | 'locked';
  mastery: number;
}

interface MasteryTreeProps {
  subject: Subject;
  userId?: string;
  isKidMode?: boolean;
  onConceptClick?: (conceptName: string, conceptKey?: string | null) => void;
}

export function MasteryTree({ subject, userId = 'anonymous', isKidMode, onConceptClick }: MasteryTreeProps) {
  const [steps, setSteps] = useState<PathStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/progress/path/${subject}?userId=${encodeURIComponent(userId)}`, {
      headers: getAuthHeader(),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSteps(res.path);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subject, userId]);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading...</div>;
  if (steps.length === 0) return <div className="text-sm text-slate-500 p-4">No concepts found.</div>;

  if (isKidMode) {
    return (
      <div className="space-y-0 py-3">
        {steps.map((step, i) => (
          <div key={step.conceptKey || step.name} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => step.status !== 'locked' && onConceptClick?.(step.name, step.conceptKey)}
                disabled={step.status === 'locked'}
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  step.status === 'mastered'
                    ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/40'
                    : step.status === 'available'
                    ? 'bg-blue-500 text-white animate-pulse ring-4 ring-blue-200 dark:ring-blue-900/50'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-400 opacity-50 cursor-not-allowed'
                } ${step.status !== 'locked' ? 'cursor-pointer hover:scale-105' : ''}`}
              >
                {step.status === 'mastered' ? (
                  <Star className="w-6 h-6" />
                ) : step.status === 'available' ? (
                  <Circle className="w-6 h-6" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </button>
              {i < steps.length - 1 && (
                <div className="w-1 h-8 bg-slate-300 dark:bg-slate-600 my-0.5" />
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step.status === 'locked' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const grouped = steps.reduce<Record<string, PathStep[]>>((acc, step) => {
    (acc[step.topic] ??= []).push(step);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-3">
      {Object.entries(grouped).map(([topic, concepts]) => (
        <div key={topic}>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {topic}
          </h3>
          <div className="space-y-1.5">
            {concepts.map((c) => (
              <button
                key={c.conceptKey || c.name}
                onClick={() => c.status !== 'locked' && onConceptClick?.(c.name, c.conceptKey)}
                disabled={c.status === 'locked'}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  c.status === 'mastered'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : c.status === 'available'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {c.status === 'mastered' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : c.status === 'available' ? (
                  <Circle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{c.name}</span>
                {c.mastery > 0 && (
                  <span className="text-[10px] font-mono">{Math.round(c.mastery)}%</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
