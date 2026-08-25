/**
 * Shared "beat" scaffold for the engine bake-off.
 *
 * Both prototypes (Pixi, R3F) render the EXACT same beat using this hook and
 * content, so the only variable being compared is the render engine itself.
 *
 * The beat = one grade-4 fraction-equivalence question, 3 choice cards, a
 * simulated "thinking" pause, then a correct-answer celebration. Wrong answers
 * are gentle (never a failure state) and let the kid try again.
 */

import { useCallback, useRef, useState } from 'react';
import { useGameSounds } from '../components/kid/useGameSounds';
import { useHaptics } from './useHaptics';

export type BeatPhase = 'asking' | 'thinking' | 'correct' | 'wrong' | 'complete';

/** Drives the canvas hero's animation state. Mirrors the engine's questionType→state mapping. */
export type HeroState = 'idle' | 'thinking' | 'celebrating' | 'puzzled';

export interface BeatChoice {
  id: string;
  label: string;
  correct?: boolean;
}

export interface BeatContent {
  prompt: string;
  choices: BeatChoice[];
}

/** The shared grade-4 beat. Ties to the fraction-equivalence "big idea" from the spine discussion. */
export const BEAT: BeatContent = {
  prompt: 'Which fraction is the same as 1/2?',
  choices: [
    { id: 'a', label: '2/4', correct: true },
    { id: 'b', label: '1/3' },
    { id: 'c', label: '3/5' },
  ],
};

export const VIDYA_LINES: Record<BeatPhase, string> = {
  asking: 'Hmm… which one is the same as one-half? Tap your answer!',
  thinking: 'Let me see…',
  correct: 'Yes! 2/4 is exactly the same as 1/2 — you can see it on a number line.',
  wrong: 'Not quite — picture half a pizza. Give it another try!',
  complete: "That's real fraction sense. Ready for the next adventure?",
};

export function phaseToHeroState(phase: BeatPhase): HeroState {
  switch (phase) {
    case 'thinking':
      return 'thinking';
    case 'correct':
    case 'complete':
      return 'celebrating';
    case 'wrong':
      return 'puzzled';
    default:
      return 'idle';
  }
}

const THINKING_MS = 650;
const CELEBRATE_MS = 1900;
const RETRY_MS = 1500;

export interface UseBeatResult {
  phase: BeatPhase;
  heroState: HeroState;
  selectedId: string | null;
  combo: number;
  pick: (choiceId: string) => void;
  reset: () => void;
}

export function useBeat(): UseBeatResult {
  const [phase, setPhase] = useState<BeatPhase>('asking');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const { play } = useGameSounds();
  const haptics = useHaptics();
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('asking');
    setSelectedId(null);
  }, [clearTimers]);

  const pick = useCallback(
    (choiceId: string) => {
      // Ignore taps unless we're waiting for an answer.
      setPhase((current) => {
        if (current !== 'asking' && current !== 'wrong') return current;

        const choice = BEAT.choices.find((c) => c.id === choiceId);
        setSelectedId(choiceId);
        play('tap');
        haptics.tap();

        clearTimers();
        timers.current.push(
          window.setTimeout(() => {
            if (choice?.correct) {
              setPhase('correct');
              setCombo((c) => c + 1);
              play('correct');
              haptics.celebrate();
              timers.current.push(
                window.setTimeout(() => {
                  setPhase('complete');
                  play('complete');
                }, CELEBRATE_MS),
              );
            } else {
              setPhase('wrong');
              play('wrong');
              timers.current.push(
                window.setTimeout(() => {
                  setPhase('asking');
                  setSelectedId(null);
                }, RETRY_MS),
              );
            }
          }, THINKING_MS),
        );

        return 'thinking';
      });
    },
    [play, haptics, clearTimers],
  );

  return { phase, heroState: phaseToHeroState(phase), selectedId, combo, pick, reset };
}
