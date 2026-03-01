import { CalendarClock, Target } from 'lucide-react';
import type { LearnerState } from '../../stores/chatStore';

interface LearnerInsightsCardProps {
  state: LearnerState;
}

export function LearnerInsightsCard({ state }: LearnerInsightsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Learner Insights
        </h3>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <CalendarClock className="w-3 h-3" />
          {new Date(state.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {state.strengths.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Strengths</div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            {state.strengths.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {state.areasForImprovement.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Focus Areas</div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            {state.areasForImprovement.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {state.nextSteps.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Next Steps</div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            {state.nextSteps.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
