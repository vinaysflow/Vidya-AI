import { useMemo, useRef, useState } from 'react';
import type { InteractionComponentProps, MatchConnectSpec } from '../types';

/**
 * Match / Connect — link each item on the left to its partner on the right.
 *
 * Powers word↔definition, equation↔answer, cause↔effect, number↔model. Tap a
 * left tile to select it, then tap its match on the right. Correct pairs lock in
 * a shared color with a check; wrong taps flash and clear. Touch-first, no drag.
 */

const PAIR_COLORS = [
  'border-emerald-400 bg-emerald-50 text-emerald-700',
  'border-violet-400 bg-violet-50 text-violet-700',
  'border-sky-400 bg-sky-50 text-sky-700',
  'border-amber-400 bg-amber-50 text-amber-700',
  'border-rose-400 bg-rose-50 text-rose-700',
  'border-teal-400 bg-teal-50 text-teal-700',
];

export function MatchConnect({ spec, onComplete, onSignal }: InteractionComponentProps<MatchConnectSpec>) {
  const left = spec.pairs;
  const right = useMemo(() => {
    const a = spec.pairs.map((p) => ({ id: p.id, ...p.right }));
    if (spec.shuffleRight === false) return a;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [spec.pairs, spec.shuffleRight]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, number>>({}); // pairId -> color index
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const matchedCount = Object.keys(matched).length;
  const solved = matchedCount === spec.pairs.length;

  const tapLeft = (id: string) => {
    if (solved || matched[id] != null) return;
    setSelectedLeft((cur) => (cur === id ? null : id));
    onSignal?.('pick_up');
  };

  const tapRight = (rightPairId: string) => {
    if (solved || !selectedLeft) return;
    // already matched on this right tile?
    if (matched[rightPairId] != null) return;
    setAttempts((a) => a + 1);
    if (rightPairId === selectedLeft) {
      const colorIdx = matchedCount % PAIR_COLORS.length;
      const next = { ...matched, [selectedLeft]: colorIdx };
      setMatched(next);
      setSelectedLeft(null);
      onSignal?.('drop_correct');
      if (Object.keys(next).length === spec.pairs.length) {
        onComplete({
          specId: spec.id,
          kind: 'match_connect',
          correct: true,
          score: 1,
          attempts: attempts + 1,
          durationMs: Date.now() - startedAt.current,
          misconceptionIds: [],
          detail: { matched: Object.keys(next) },
        });
      }
    } else {
      setWrong({ left: selectedLeft, right: rightPairId });
      onSignal?.('drop_wrong');
      window.setTimeout(() => setWrong(null), 450);
      setSelectedLeft(null);
    }
  };

  const cell = (
    content: { label: string; emoji?: string },
    state: { matchedColor?: number; selected?: boolean; wrong?: boolean; done?: boolean; onClick?: () => void },
  ) => (
    <button
      type="button"
      onClick={state.onClick}
      disabled={state.done}
      className={[
        'flex w-full items-center gap-2 rounded-2xl border-[3px] px-4 py-3 text-left text-base font-extrabold shadow-sm transition-all',
        state.matchedColor != null
          ? PAIR_COLORS[state.matchedColor]
          : state.wrong
            ? 'animate-[wrongShake_0.4s_ease] border-rose-300 bg-rose-50 text-rose-600'
            : state.selected
              ? 'border-violet-500 bg-violet-100 text-violet-800 ring-2 ring-violet-300'
              : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 active:scale-[0.98]',
      ].join(' ')}
    >
      {content.emoji && <span className="text-2xl">{content.emoji}</span>}
      <span className="flex-1">{content.label}</span>
      {state.matchedColor != null && <span className="text-lg">✓</span>}
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? 'Tap one on the left, then its match on the right.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {left.map((p) => (
            <div key={p.id}>
              {cell(p.left, {
                matchedColor: matched[p.id],
                selected: selectedLeft === p.id,
                wrong: wrong?.left === p.id,
                done: solved || matched[p.id] != null,
                onClick: () => tapLeft(p.id),
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((r) => (
            <div key={r.id}>
              {cell(
                { label: r.label, emoji: r.emoji },
                {
                  matchedColor: matched[r.id],
                  wrong: wrong?.right === r.id,
                  done: solved || matched[r.id] != null,
                  onClick: () => tapRight(r.id),
                },
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs font-semibold text-slate-400">
        {matchedCount}/{spec.pairs.length} matched
      </div>

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center text-lg font-black text-emerald-600">
          ✨ All matched! ✨
        </div>
      )}
    </div>
  );
}
