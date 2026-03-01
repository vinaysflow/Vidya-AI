import { Zap, Flame, Clock, BookOpen } from 'lucide-react';

interface StudentSummary {
  studentName: string | null;
  totalSessions: number;
  totalMinutes: number;
  xpEarned: number;
  currentStreak: number;
  badgesEarned: number;
  strengths: string[];
  focusAreas: string[];
  subjectBreakdown: Array<{ subject: string; sessions: number }>;
}

export function StudentSummaryCard({ summary }: { summary: StudentSummary }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white">
        {summary.studentName || 'Student'}
      </h3>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <BookOpen className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{summary.totalSessions}</div>
          <div className="text-[10px] text-slate-500">Sessions</div>
        </div>
        <div className="text-center">
          <Clock className="h-4 w-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{summary.totalMinutes}m</div>
          <div className="text-[10px] text-slate-500">Time</div>
        </div>
        <div className="text-center">
          <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{summary.xpEarned}</div>
          <div className="text-[10px] text-slate-500">XP</div>
        </div>
        <div className="text-center">
          <Flame className="h-4 w-4 mx-auto text-orange-500 mb-1" />
          <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{summary.currentStreak}</div>
          <div className="text-[10px] text-slate-500">Streak</div>
        </div>
      </div>

      {summary.strengths.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">Strengths</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {summary.strengths.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-[10px]">{s}</span>
            ))}
          </div>
        </div>
      )}

      {summary.focusAreas.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Focus Areas</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {summary.focusAreas.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-[10px]">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
