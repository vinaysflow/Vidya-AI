import { CheckCircle, Lightbulb, ListChecks } from 'lucide-react';
import type { SessionReport } from '../../stores/chatStore';

interface SessionSummaryCardProps {
  report: SessionReport;
}

export function SessionSummaryCard({ report }: SessionSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Session Summary
        </h3>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
        {report.summary}
      </p>

      <div className="grid gap-3 mt-4">
        {report.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Strengths
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {report.strengths.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {report.areasForImprovement.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Areas to Improve
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {report.areasForImprovement.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {report.nextSteps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              <ListChecks className="w-3.5 h-3.5 text-blue-500" />
              Next Steps
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {report.nextSteps.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
