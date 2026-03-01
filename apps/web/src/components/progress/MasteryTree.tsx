import { useEffect, useState } from 'react';
import { Lock, CheckCircle, Circle } from 'lucide-react';
import type { Subject } from '../../stores/chatStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface PathStep {
  conceptKey: string | null;
  name: string;
  topic: string;
  status: 'mastered' | 'available' | 'locked';
  mastery: number;
}

interface MasteryTreeProps {
  subject: Subject;
  onConceptClick?: (conceptName: string) => void;
}

export function MasteryTree({ subject, onConceptClick }: MasteryTreeProps) {
  const [steps, setSteps] = useState<PathStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/progress/path/${subject}?userId=anonymous`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSteps(res.path);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subject]);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading...</div>;
  if (steps.length === 0) return <div className="text-sm text-slate-500 p-4">No concepts found.</div>;

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
                onClick={() => c.status !== 'locked' && onConceptClick?.(c.name)}
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
