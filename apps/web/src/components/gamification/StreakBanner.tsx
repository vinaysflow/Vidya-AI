import { Flame, Snowflake } from 'lucide-react';

interface StreakBannerProps {
  streak: number;
  streakFreezes: number;
}

export function StreakBanner({ streak, streakFreezes }: StreakBannerProps) {
  if (streak <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold">
      <Flame
        className={`h-4 w-4 ${
          streak >= 7
            ? 'text-orange-500 animate-pulse'
            : 'text-orange-400'
        }`}
      />
      <span className="text-orange-600 dark:text-orange-400">{streak} day streak</span>
      {streakFreezes > 0 && (
        <span className="flex items-center gap-0.5 text-blue-500 dark:text-blue-400 ml-1">
          <Snowflake className="h-3 w-3" />
          {streakFreezes}
        </span>
      )}
    </div>
  );
}
