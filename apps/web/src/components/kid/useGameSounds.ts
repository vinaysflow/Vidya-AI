/**
 * useGameSounds — lightweight sound effects for kid mode.
 *
 * Uses the Web Audio API to synthesize tones directly — no audio files,
 * no external dependencies, works offline/PWA. Each sound is generated
 * once and played on demand.
 *
 * Respects calmMode from chatStore: all sounds are muted when enabled.
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';

type SoundName = 'correct' | 'wrong' | 'complete' | 'questStart' | 'levelUp' | 'tap';

function createAudioContext(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

/** Play a simple synthesized sound using Web Audio API */
function playTone(
  ctx: AudioContext,
  notes: Array<{ freq: number; start: number; duration: number; gain?: number }>,
  waveType: OscillatorType = 'sine'
) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
  masterGain.connect(ctx.destination);

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);

    const noteGain = note.gain ?? 0.3;
    gainNode.gain.setValueAtTime(0, ctx.currentTime + note.start);
    gainNode.gain.linearRampToValueAtTime(noteGain, ctx.currentTime + note.start + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + note.start + note.duration);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(ctx.currentTime + note.start);
    osc.stop(ctx.currentTime + note.start + note.duration + 0.05);
  }
}

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  // Bright ascending ding — two quick notes going up
  correct: (ctx) => playTone(ctx, [
    { freq: 523, start: 0,    duration: 0.12 }, // C5
    { freq: 659, start: 0.10, duration: 0.18 }, // E5
    { freq: 784, start: 0.22, duration: 0.25 }, // G5
  ], 'sine'),

  // Neutral double-chime — signals "hmm, let's think" not "you failed"
  // Research: descending tones trigger avoidance; a flat/gentle chime stays emotionally neutral
  wrong: (ctx) => playTone(ctx, [
    { freq: 440, start: 0,    duration: 0.10, gain: 0.18 }, // A4 — soft, familiar
    { freq: 440, start: 0.14, duration: 0.14, gain: 0.12 }, // repeat at lower gain — double-chime
  ], 'sine'),

  // Short bright chime — two ascending notes, signals "adventure begin"
  questStart: (ctx) => playTone(ctx, [
    { freq: 587, start: 0,    duration: 0.12 }, // D5
    { freq: 880, start: 0.14, duration: 0.22 }, // A5
  ], 'sine'),

  // Level up fanfare — 5-note ascending run
  levelUp: (ctx) => playTone(ctx, [
    { freq: 523,  start: 0,    duration: 0.10 }, // C5
    { freq: 659,  start: 0.10, duration: 0.10 }, // E5
    { freq: 784,  start: 0.20, duration: 0.10 }, // G5
    { freq: 988,  start: 0.30, duration: 0.10 }, // B5
    { freq: 1047, start: 0.40, duration: 0.35 }, // C6
  ], 'sine'),

  // Very short tactile tap — 80ms click
  tap: (ctx) => playTone(ctx, [
    { freq: 400, start: 0, duration: 0.05, gain: 0.2 },
    { freq: 350, start: 0.04, duration: 0.04, gain: 0.15 },
  ], 'triangle'),

  // Fanfare — ascending chord arpeggio
  complete: (ctx) => playTone(ctx, [
    { freq: 523, start: 0,    duration: 0.15 }, // C5
    { freq: 659, start: 0.12, duration: 0.15 }, // E5
    { freq: 784, start: 0.24, duration: 0.15 }, // G5
    { freq: 1047, start: 0.36, duration: 0.35 }, // C6
    { freq: 784, start: 0.50, duration: 0.12 },
    { freq: 1047, start: 0.62, duration: 0.45 },
  ], 'sine'),
};

export function useGameSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const { calmMode } = useChatStore();

  const play = useCallback((name: SoundName) => {
    if (calmMode) return; // mute all sounds in calm mode
    try {
      if (!ctxRef.current) {
        ctxRef.current = createAudioContext();
      }
      const ctx = ctxRef.current;
      if (!ctx) return;

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => SOUNDS[name](ctx)).catch(() => {});
      } else {
        SOUNDS[name](ctx);
      }
    } catch {
      // Sound is best-effort — never crash the game
    }
  }, [calmMode]);

  return { play };
}
