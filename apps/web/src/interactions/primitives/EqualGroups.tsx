import { useMemo, useRef, useState } from 'react';
import type { EqualGroupsSpec, InteractionComponentProps } from '../types';

/**
 * Equal Groups — the manipulative behind multiplication and division.
 *
 * Instead of picking "24" from a list of letters, the child BUILDS it: tap a
 * basket to drop an apple in, fill every basket with the same amount, and watch
 * the total (and the number sentence 4 × 6 = 24) emerge. Tapping an apple takes
 * it back out. Touch-first (tap, not drag) so it's rock-solid on a tablet.
 *
 * The math is the gameplay — exactly the "4 baskets, 6 apples each" problem,
 * made into a thing you do with your hands.
 */
export function EqualGroups({ spec, onComplete, onSignal }: InteractionComponentProps<EqualGroupsSpec>) {
  const { groups, perGroup, total, itemEmoji } = spec;
  const containerEmoji = spec.containerEmoji ?? '🧺';
  const containerLabel = spec.containerLabel ?? 'group';

  const [counts, setCounts] = useState<number[]>(() => Array(groups).fill(0));
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pulse, setPulse] = useState<number | null>(null);
  const startedAt = useRef<number>(Date.now());
  const maxPerGroup = perGroup + 3; // allow a little overfill so they can self-correct

  const placed = counts.reduce((a, b) => a + b, 0);
  const runningTotal = placed;
  const everyGroupRight = counts.length > 0 && counts.every((c) => c === perGroup);

  const finish = () => {
    if (solved) return;
    setSolved(true);
    onSignal?.('drop_correct');
    onComplete({
      specId: spec.id,
      kind: 'equal_groups',
      correct: true,
      score: 1,
      attempts: attempts + 1,
      durationMs: Date.now() - startedAt.current,
      misconceptionIds: [],
      detail: { groups, perGroup, total, counts },
    });
  };

  const addTo = (i: number) => {
    if (solved) return;
    setCounts((prev) => {
      if (prev[i] >= maxPerGroup) return prev;
      const next = [...prev];
      next[i] += 1;
      // auto-complete the moment every basket holds exactly perGroup
      if (next.every((c) => c === perGroup)) {
        setAttempts((a) => a + 1);
        onSignal?.('all_placed');
        window.setTimeout(finish, 150);
      } else {
        onSignal?.('pick_up');
      }
      return next;
    });
    setPulse(i);
    window.setTimeout(() => setPulse((p) => (p === i ? null : p)), 200);
  };

  const removeFrom = (i: number) => {
    if (solved) return;
    setCounts((prev) => {
      if (prev[i] <= 0) return prev;
      const next = [...prev];
      next[i] -= 1;
      return next;
    });
  };

  const numberSentence = useMemo(() => `${groups} × ${perGroup} = ${total}`, [groups, perGroup, total]);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Mission */}
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? `Tap each ${containerLabel} to add ${itemEmoji}. Put ${perGroup} in every ${containerLabel}.`}
        </div>
      </div>

      {/* Live total — the answer the child is building, not picking */}
      <div className="flex items-center justify-center gap-3">
        <div
          className={[
            'rounded-2xl border-2 px-5 py-2 text-center transition-all',
            everyGroupRight
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-violet-200 bg-white',
          ].join(' ')}
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total in all</div>
          <div className={['text-3xl font-black tabular-nums', everyGroupRight ? 'text-emerald-600' : 'text-violet-600'].join(' ')}>
            {runningTotal}
          </div>
        </div>
      </div>

      {/* The groups */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(groups, 4)}, minmax(0, 1fr))` }}
      >
        {counts.map((count, i) => {
          const full = count === perGroup;
          const over = count > perGroup;
          return (
            <button
              key={i}
              type="button"
              onClick={() => addTo(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                removeFrom(i);
              }}
              disabled={solved}
              className={[
                'group relative flex min-h-[132px] select-none flex-col items-center rounded-3xl border-[3px] p-3 transition-all',
                pulse === i ? 'scale-[1.04]' : '',
                over
                  ? 'border-rose-300 bg-rose-50'
                  : full
                    ? 'border-emerald-300 bg-emerald-50 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]'
                    : 'border-violet-200 bg-white hover:border-violet-300 active:scale-[0.98]',
              ].join(' ')}
            >
              <div className="text-2xl">{containerEmoji}</div>
              <div className="mt-1 flex flex-1 flex-wrap content-start items-start justify-center gap-0.5">
                {Array.from({ length: count }, (_, k) => (
                  <span
                    key={k}
                    className="animate-[scorePop_0.25s_ease] text-xl leading-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFrom(i);
                    }}
                  >
                    {itemEmoji}
                  </span>
                ))}
              </div>
              <div
                className={[
                  'mt-1 rounded-full px-2 py-0.5 text-xs font-black tabular-nums',
                  over ? 'bg-rose-200 text-rose-700' : full ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {count} / {perGroup}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs font-semibold text-slate-400">
        Tap a {containerLabel} to add {itemEmoji} · tap an {itemEmoji} to take it out
      </div>

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center">
          <div className="text-2xl font-black text-emerald-600">{numberSentence} ✨</div>
          <div className="text-sm font-bold text-emerald-500">You built it!</div>
        </div>
      )}
    </div>
  );
}
