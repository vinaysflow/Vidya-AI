import { useEffect, useState } from 'react';
import { Star, Snowflake } from 'lucide-react';

interface LevelUpModalProps {
  level: number;
  streakFreezeEarned?: boolean;
  onClose: () => void;
}

export function LevelUpModal({ level, streakFreezeEarned, onClose }: LevelUpModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-2xl transform transition-transform duration-500 ${
          visible ? 'scale-100' : 'scale-75'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="animate-bounce mb-4">
          <Star className="h-16 w-16 text-amber-400 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Level {level}!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Keep going, you&apos;re doing great!
        </p>
        {streakFreezeEarned && (
          <div className="flex items-center justify-center gap-2 text-blue-500 text-sm font-medium">
            <Snowflake className="h-4 w-4" />
            Streak Freeze earned!
          </div>
        )}
        {/* CSS confetti particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
