import { useEffect, useState } from 'react';
import { Star, Snowflake } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LevelUpModalProps {
  level: number;
  streakFreezeEarned?: boolean;
  onClose: () => void;
  isKidMode?: boolean;
}

export function LevelUpModal({ level, streakFreezeEarned, onClose, isKidMode }: LevelUpModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(onClose, isKidMode ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [onClose, isKidMode]);

  const title = isKidMode ? `You reached Level ${level}!` : `Level ${level}!`;
  const subtitle = isKidMode ? 'New quests are ready for you!' : "Keep going, you're doing great!";
  const streakText = isKidMode ? 'You earned a Streak Freeze!' : 'Streak Freeze earned!';
  const confettiCount = isKidMode ? 40 : 20;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={cn(
          'rounded-2xl p-8 text-center shadow-2xl transform transition-transform duration-500',
          visible ? 'scale-100' : 'scale-75',
          isKidMode
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30'
            : 'bg-white dark:bg-slate-800'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="animate-bounce mb-4">
          <Star className={cn('text-amber-400 mx-auto', isKidMode ? 'h-20 w-20' : 'h-16 w-16')} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {subtitle}
        </p>
        {streakFreezeEarned && (
          <div className="flex items-center justify-center gap-2 text-blue-500 text-sm font-medium">
            <Snowflake className="h-4 w-4" />
            {streakText}
          </div>
        )}
        {/* CSS confetti particles - radial burst for kid mode, rain for adult */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: confettiCount }).map((_, i) => {
            const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
            const angle = (i / confettiCount) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 80 + Math.random() * 120;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 40;
            const size = isKidMode ? [2, 3, 4][i % 3] : 2;
            const isSquare = isKidMode && i % 3 === 1;
            return (
              <span
                key={i}
                className={cn('absolute', isKidMode ? 'animate-confetti-burst' : 'animate-confetti')}
                style={{
                  left: isKidMode ? '50%' : `${Math.random() * 100}%`,
                  top: isKidMode ? '50%' : '-10px',
                  width: size,
                  height: size,
                  borderRadius: isSquare ? 0 : '9999px',
                  backgroundColor: colors[i % colors.length],
                  ['--dx' as string]: `${dx}px`,
                  ['--dy' as string]: `${dy}px`,
                  animationDelay: `${Math.random() * 0.4}s`,
                  animationDuration: isKidMode ? `${1.2 + Math.random() * 0.8}s` : `${1 + Math.random() * 1.5}s`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
