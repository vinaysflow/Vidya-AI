/**
 * TransitionCard
 *
 * A phase-change preview card shown before every major scene transition in GameScene.
 * Gives neurodiverse learners predictability and reduces task-switch cognitive load.
 *
 * Academic basis:
 *  - Executive function research: predictability and advance notice reduce transition anxiety
 *  - UDL: options for self-regulation (preview of next task)
 *
 * Behavior:
 *  - Auto-dismisses after 2000ms
 *  - Dismisses immediately on tap/click
 *  - In calmMode: fade animation only (no slide-up motion)
 */

import { useEffect } from 'react';
import { cn } from '../../lib/utils';

interface TransitionCardProps {
  message: string;
  onDismiss: () => void;
  calmMode?: boolean;
}

export function TransitionCard({ message, onDismiss, calmMode = false }: TransitionCardProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 cursor-pointer',
        'bg-indigo-900/90 backdrop-blur-sm text-white',
        'rounded-2xl px-5 py-3 shadow-xl',
        'flex items-center gap-3 max-w-xs w-full',
        calmMode ? 'animate-transition-fade' : 'animate-transition-slide',
      )}
    >
      <span className="text-2xl shrink-0">✨</span>
      <span className="text-sm font-semibold leading-snug">{message}</span>
    </div>
  );
}
