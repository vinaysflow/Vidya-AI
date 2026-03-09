import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface XPBarProps {
  xp: number;
  level: number;
  nextLevelXp: number;
  recentXp?: number;
}

export function XPBar({ xp, level, nextLevelXp, recentXp }: XPBarProps) {
  const LEVEL_XP = 100; // Match apps/api/src/services/gamification/xpTable.ts
  const [showFlyUp, setShowFlyUp] = useState(false);
  const progress = nextLevelXp > 0 ? ((xp % LEVEL_XP) / LEVEL_XP) * 100 : 0;

  useEffect(() => {
    if (recentXp && recentXp > 0) {
      setShowFlyUp(true);
      const t = setTimeout(() => setShowFlyUp(false), 1500);
      return () => clearTimeout(t);
    }
  }, [recentXp]);

  return (
    <div className="relative flex items-center gap-2 px-3 py-1">
      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
        <Zap className="h-3.5 w-3.5" />
        <span>Lv {level}</span>
      </div>
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
        {xp % LEVEL_XP}/{LEVEL_XP} XP
      </span>

      {showFlyUp && recentXp && (
        <span className="absolute right-4 -top-3 text-xs font-bold text-amber-500 animate-xp-fly">
          +{recentXp} XP
        </span>
      )}
    </div>
  );
}
