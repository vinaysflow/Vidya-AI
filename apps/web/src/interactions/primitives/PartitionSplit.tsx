import { useRef, useState } from 'react';
import type { InteractionComponentProps, PartitionSplitSpec } from '../types';

/**
 * Partition / Split — the manipulative behind fractions.
 *
 * The whole is shown already divided into `denominator` equal parts (bar or
 * circle). The child taps parts to shade them until they've shaded the fraction
 * asked for. Seeing 3 of 4 equal parts fill in is the concept — far better than
 * picking "3/4" off a list. Tap again to un-shade (self-correction).
 */

// Build an SVG wedge path for slice i of n in a circle centred at (cx,cy).
function wedgePath(cx: number, cy: number, r: number, i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

export function PartitionSplit({ spec, onComplete, onSignal }: InteractionComponentProps<PartitionSplitSpec>) {
  const { numerator, denominator } = spec;
  const shape = spec.shape ?? 'bar';
  const [shaded, setShaded] = useState<boolean[]>(() => Array(denominator).fill(false));
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const shadedCount = shaded.filter(Boolean).length;

  const toggle = (i: number) => {
    if (solved) return;
    setShaded((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      const count = next.filter(Boolean).length;
      if (count === numerator) {
        setAttempts((a) => a + 1);
        onSignal?.('all_placed');
        window.setTimeout(() => {
          setSolved(true);
          onSignal?.('drop_correct');
          onComplete({
            specId: spec.id,
            kind: 'partition_split',
            correct: true,
            score: 1,
            attempts: attempts + 1,
            durationMs: Date.now() - startedAt.current,
            misconceptionIds: [],
            detail: { numerator, denominator },
          });
        }, 180);
      } else {
        onSignal?.(next[i] ? 'pick_up' : 'drop_wrong');
      }
      return next;
    });
  };

  const fractionText = `${shadedCount}/${denominator}`;
  const target = `${numerator}/${denominator}`;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? `Tap the parts to shade ${target}.`}
        </div>
      </div>

      {/* Live fraction the child is building */}
      <div className="flex items-center justify-center">
        <div
          className={[
            'rounded-2xl border-2 px-6 py-2 text-center transition-all',
            shadedCount === numerator ? 'border-emerald-300 bg-emerald-50' : 'border-violet-200 bg-white',
          ].join(' ')}
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">You shaded</div>
          <div
            className={[
              'text-3xl font-black tabular-nums',
              shadedCount === numerator ? 'text-emerald-600' : 'text-violet-600',
            ].join(' ')}
          >
            {fractionText}
          </div>
        </div>
      </div>

      {/* The whole, partitioned */}
      {shape === 'circle' ? (
        <div className="flex justify-center">
          <svg viewBox="0 0 200 200" className="h-56 w-56 select-none">
            {Array.from({ length: denominator }, (_, i) => (
              <path
                key={i}
                d={wedgePath(100, 100, 92, i, denominator)}
                onClick={() => toggle(i)}
                className={[
                  'cursor-pointer transition-colors',
                  shaded[i] ? 'fill-violet-500' : 'fill-white hover:fill-violet-100',
                ].join(' ')}
                stroke="#7c3aed"
                strokeWidth={2}
              />
            ))}
          </svg>
        </div>
      ) : (
        <div className="flex w-full gap-1.5">
          {Array.from({ length: denominator }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={solved}
              aria-label={`Part ${i + 1}`}
              className={[
                'h-24 flex-1 rounded-2xl border-[3px] transition-all active:scale-[0.97]',
                shaded[i]
                  ? 'animate-[scorePop_0.2s_ease] border-violet-600 bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg'
                  : 'border-violet-200 bg-white hover:border-violet-300 hover:bg-violet-50',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      <div className="text-center text-xs font-semibold text-slate-400">
        Tap a part to shade it · tap again to clear
      </div>

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center">
          <div className="text-2xl font-black text-emerald-600">{target} shaded ✨</div>
          <div className="text-sm font-bold text-emerald-500">That's the fraction!</div>
        </div>
      )}
    </div>
  );
}
