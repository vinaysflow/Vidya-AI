import {
  Footprints, Lightbulb, Flame, Bug, Globe, GraduationCap,
  MessageSquare, Award, Compass, Trophy
} from 'lucide-react';

const BADGE_META: Record<string, { icon: any; label: string; description: string }> = {
  FIRST_STEP:       { icon: Footprints,     label: 'First Step',       description: 'Complete your first session' },
  AHA_MOMENT:       { icon: Lightbulb,      label: 'Aha Moment',       description: 'Get very close to the solution' },
  STREAK_5:         { icon: Flame,           label: '5-Day Streak',     description: 'Study for 5 days in a row' },
  STREAK_30:        { icon: Flame,           label: '30-Day Streak',    description: 'Study for 30 days in a row' },
  DEBUGGER:         { icon: Bug,             label: 'Debugger',         description: 'Complete 5 coding sessions' },
  POLYGLOT:         { icon: Globe,           label: 'Polyglot',         description: 'Use 3 different languages' },
  SCHOLAR:          { icon: GraduationCap,   label: 'Scholar',          description: 'Reach level 10' },
  EXPLAIN_IT:       { icon: MessageSquare,   label: 'Explain It',       description: 'Successfully explain a concept back' },
  DEEP_DIVER:       { icon: Compass,         label: 'Deep Diver',       description: '20+ message session with resolution' },
  QUIZ_MASTER:      { icon: Trophy,          label: 'Quiz Master',      description: 'Score perfectly on a quiz' },
  SUBJECT_EXPLORER: { icon: Award,           label: 'Explorer',         description: 'Try 5 different subjects' },
};

interface BadgeGridProps {
  earned: { badge: string; earnedAt: Date }[];
}

export function BadgeGrid({ earned }: BadgeGridProps) {
  const earnedSet = new Set(earned.map((b) => b.badge));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3">
      {Object.entries(BADGE_META).map(([key, meta]) => {
        const isEarned = earnedSet.has(key);
        const Icon = meta.icon;
        return (
          <div
            key={key}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              isEarned
                ? 'bg-amber-50 dark:bg-amber-900/30'
                : 'bg-slate-100 dark:bg-slate-800 opacity-40'
            }`}
            title={meta.description}
          >
            <Icon
              className={`h-6 w-6 ${
                isEarned ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'
              }`}
            />
            <span className="text-[10px] text-center leading-tight font-medium text-slate-700 dark:text-slate-300">
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
