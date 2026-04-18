/**
 * NarrativeExit — calm, narrative-driven session end overlay.
 *
 * Replaces the default LevelUpModal for kid-path session endings. Presents
 * a neutral exit message with a theme-specific narrative thread, auto-dismisses
 * after 4 seconds, and supports tap-to-dismiss.
 *
 * P5: No praise — message is "Good work today. {thread}. See you next time."
 * P6: Neurodiverse design — calm, predictable, no sudden sounds or animations.
 *     Aria live region ensures screen reader accessibility.
 */

import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { pickExitThread } from '../../lib/narrativeExits';

interface NarrativeExitProps {
  questTheme: string | null;
  onDismiss: () => void;
  calmMode?: boolean;
}

export function NarrativeExit({ questTheme, onDismiss, calmMode = false }: NarrativeExitProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const thread = pickExitThread(questTheme);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center cursor-pointer',
        'bg-slate-900/60 backdrop-blur-sm',
        calmMode ? 'animate-fade-in' : 'animate-transition-fade',
      )}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl px-8 py-6 max-w-sm mx-4 shadow-xl">
        <p className="text-lg text-slate-800 dark:text-slate-100 leading-relaxed">
          Good work today. {thread}. See you next time.
        </p>
        <p className="mt-3 text-xs text-slate-400">Tap to dismiss</p>
      </div>
    </div>
  );
}
