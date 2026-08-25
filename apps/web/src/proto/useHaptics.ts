/**
 * Web Vibration API haptics for the prototypes. Enhancement only — silently
 * no-ops where unsupported (notably iOS Safari). Patterns mirror the
 * game-feel brief (§6).
 */

import { useMemo } from 'react';

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* best-effort */
  }
}

export interface Haptics {
  tap: () => void;
  correct: () => void;
  celebrate: () => void;
  transition: () => void;
}

export function useHaptics(): Haptics {
  return useMemo<Haptics>(
    () => ({
      tap: () => vibrate(10),
      correct: () => vibrate(30),
      celebrate: () => vibrate([0, 60, 40, 60, 40, 100]),
      transition: () => vibrate(15),
    }),
    [],
  );
}
