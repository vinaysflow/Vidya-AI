import { useMemo, useRef, useState } from 'react';
import type { CompletePatternSpec, InteractionComponentProps } from '../types';
import { colorOf, isLightColor } from '../colorTokens';

/**
 * Complete the Pattern — see the sequence, fill the blank(s).
 *
 * The pattern is shown as TILES, not words: a red/blue pattern renders as actual
 * red and blue squares so "what comes next?" is a visual act, and the answer
 * options are colored tiles you tap. Falls back to labelled tiles for non-color
 * patterns (shapes, numbers). Powers algebraic-thinking patterns across grades.
 */

interface TileProps {
  label: string;
  emoji?: string;
  state?: 'blank' | 'active' | 'filled' | 'wrong';
  onClick?: () => void;
}

function Tile({ label, emoji, state = 'filled', onClick }: TileProps) {
  const color = colorOf(label);
  const base =
    'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] text-lg font-black transition-all';
  if (state === 'blank' || state === 'active') {
    return (
      <div
        className={[
          base,
          'border-dashed text-slate-300',
          state === 'active' ? 'border-violet-400 bg-violet-50 animate-[scorePop_0.6s_ease-in-out_infinite]' : 'border-slate-300 bg-white',
        ].join(' ')}
      >
        ?
      </div>
    );
  }
  // Filled / wrong
  const wrong = state === 'wrong';
  if (color) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[base, wrong ? 'animate-[wrongShake_0.4s_ease] border-rose-400' : 'border-black/10', 'shadow-md'].join(' ')}
        style={{ backgroundColor: color }}
        aria-label={label}
      >
        {isLightColor(color) && <span className="text-xs font-bold text-slate-500">{label}</span>}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        base,
        wrong ? 'animate-[wrongShake_0.4s_ease] border-rose-300 bg-rose-50 text-rose-600' : 'border-violet-200 bg-white text-slate-700',
        'shadow-md',
      ].join(' ')}
    >
      {emoji ? <span className="text-2xl">{emoji}</span> : label}
    </button>
  );
}

export function CompletePattern({ spec, onComplete, onSignal }: InteractionComponentProps<CompletePatternSpec>) {
  // indices of the blanks (nulls) in order
  const blankIndices = useMemo(
    () => spec.sequence.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0),
    [spec.sequence],
  );
  const optionById = useMemo(() => {
    const m: Record<string, { id: string; label: string; emoji?: string }> = {};
    for (const o of spec.options) m[o.id] = o;
    return m;
  }, [spec.options]);

  const [fills, setFills] = useState<(string | null)[]>(() => blankIndices.map(() => null));
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const nextBlankSlot = fills.findIndex((f) => f === null);

  const pick = (optionId: string) => {
    if (solved || nextBlankSlot < 0) return;
    const correctId = spec.solution[nextBlankSlot];
    if (optionId === correctId) {
      const nextFills = [...fills];
      nextFills[nextBlankSlot] = optionId;
      setFills(nextFills);
      onSignal?.('drop_correct');
      if (nextFills.every((f) => f !== null)) {
        setAttempts((a) => a + 1);
        setSolved(true);
        onComplete({
          specId: spec.id,
          kind: 'complete_pattern',
          correct: true,
          score: 1,
          attempts: attempts + 1,
          durationMs: Date.now() - startedAt.current,
          misconceptionIds: [],
          detail: { fills: nextFills },
        });
      }
    } else {
      setAttempts((a) => a + 1);
      setWrongAt(blankIndices[nextBlankSlot]);
      onSignal?.('drop_wrong');
      window.setTimeout(() => setWrongAt(null), 500);
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? 'Tap the tile that comes next.'}
        </div>
      </div>

      {/* The pattern, as tiles */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-slate-100 bg-slate-50 p-4">
        {spec.sequence.map((val, i) => {
          if (val === null) {
            const slot = blankIndices.indexOf(i);
            const filledId = fills[slot];
            if (filledId) {
              const o = optionById[filledId];
              return <Tile key={i} label={o?.label ?? filledId} emoji={o?.emoji} state="filled" />;
            }
            const isWrong = wrongAt === i;
            const isActive = blankIndices[nextBlankSlot] === i;
            return <Tile key={i} label="?" state={isWrong ? 'wrong' : isActive ? 'active' : 'blank'} />;
          }
          return <Tile key={i} label={val} state="filled" />;
        })}
      </div>

      {/* Option tiles to tap */}
      {!solved && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {spec.options.map((o) => (
            <Tile key={o.id} label={o.label} emoji={o.emoji} state="filled" onClick={() => pick(o.id)} />
          ))}
        </div>
      )}

      <div className="text-center text-xs font-semibold text-slate-400">
        What comes next in the pattern? Tap a tile below.
      </div>

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center text-lg font-black text-emerald-600">
          ✨ You completed the pattern! ✨
        </div>
      )}
    </div>
  );
}
