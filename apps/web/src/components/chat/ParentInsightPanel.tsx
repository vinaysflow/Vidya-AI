import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ParentInsightPanelProps {
  questionType?: string;
  distanceFromSolution?: number;
  hintLevel?: number;
  conceptsIdentified?: string[];
}

export function ParentInsightPanel({
  questionType,
  distanceFromSolution,
  hintLevel,
  conceptsIdentified,
}: ParentInsightPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMeta =
    questionType ||
    (distanceFromSolution !== undefined && distanceFromSolution < 100) ||
    (hintLevel !== undefined && hintLevel > 0) ||
    (conceptsIdentified && conceptsIdentified.length > 0);

  if (!hasMeta) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
        aria-label={expanded ? 'Hide parent insight' : 'Show parent insight'}
      >
        {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span>Parent view</span>
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/60 p-2 text-[10px] space-y-1.5">
          {questionType && (
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Type:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">{questionType}</span>
            </div>
          )}
          {distanceFromSolution !== undefined && distanceFromSolution < 100 && (
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Distance:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">{distanceFromSolution}%</span>
              <div className="mt-0.5 h-1 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full"
                  style={{ width: `${100 - distanceFromSolution}%` }}
                />
              </div>
            </div>
          )}
          {hintLevel !== undefined && hintLevel > 0 && (
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Hint level:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">{hintLevel}/5</span>
            </div>
          )}
          {conceptsIdentified && conceptsIdentified.length > 0 && (
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Concepts:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">
                {conceptsIdentified.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
