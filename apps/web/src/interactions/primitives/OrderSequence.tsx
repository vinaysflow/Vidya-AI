import { useMemo, useRef, useState } from 'react';
import type { InteractionComponentProps, OrderItem, OrderSequenceSpec } from '../types';

/**
 * Order / Sequence — arrange items into the right order.
 *
 * Powers "order from least to greatest", sequencing story events, ordering steps
 * of a process, timelines. The child taps tiles in the order they belong; they
 * drop into numbered slots left→right. Tap a placed tile to send it back. Wrong
 * placements shake and return so the child can re-try (productive struggle).
 */

export function OrderSequence({ spec, onComplete, onSignal }: InteractionComponentProps<OrderSequenceSpec>) {
  const shuffled = useMemo(() => {
    const a = [...spec.items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [spec.items]);
  const n = spec.items.length;

  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [wrongSlots, setWrongSlots] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const itemById = useMemo(() => {
    const m: Record<string, OrderItem> = {};
    for (const it of spec.items) m[it.id] = it;
    return m;
  }, [spec.items]);

  const placedIds = new Set(slots.filter((s): s is string => s !== null));
  const trayItems = shuffled.filter((it) => !placedIds.has(it.id));

  const placeNext = (itemId: string) => {
    if (solved) return;
    const slotIdx = slots.findIndex((s) => s === null);
    if (slotIdx < 0) return;
    const next = [...slots];
    next[slotIdx] = itemId;
    setSlots(next);
    onSignal?.('pick_up');
    if (next.every((s) => s !== null)) evaluate(next);
  };

  const removeAt = (slotIdx: number) => {
    if (solved) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setWrongSlots(new Set());
  };

  const evaluate = (next: (string | null)[]) => {
    const wrong = new Set<number>();
    next.forEach((id, idx) => {
      if (!id || itemById[id].correctIndex !== idx) wrong.add(idx);
    });
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    onSignal?.('all_placed');
    if (wrong.size === 0) {
      setSolved(true);
      onSignal?.('drop_correct');
      onComplete({
        specId: spec.id,
        kind: 'order_sequence',
        correct: true,
        score: 1,
        attempts: attemptNo,
        durationMs: Date.now() - startedAt.current,
        misconceptionIds: [],
        detail: { order: next },
      });
      return;
    }
    setWrongSlots(wrong);
    onSignal?.('drop_wrong');
    window.setTimeout(() => {
      setSlots((prev) => {
        const cleared = [...prev];
        wrong.forEach((idx) => (cleared[idx] = null));
        return cleared;
      });
      setWrongSlots(new Set());
    }, 800);
  };

  const tile = (label: string, emoji: string | undefined, opts?: { wrong?: boolean; onClick?: () => void; ghost?: boolean }) => (
    <button
      type="button"
      onClick={opts?.onClick}
      disabled={solved}
      className={[
        'flex h-16 min-w-[60px] items-center justify-center gap-1 rounded-2xl border-[3px] px-3 text-lg font-black shadow-md transition-all',
        opts?.ghost
          ? 'border-dashed border-slate-300 bg-white/60 text-slate-300'
          : opts?.wrong
            ? 'animate-[wrongShake_0.4s_ease] border-rose-300 bg-rose-50 text-rose-600'
            : solved
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-violet-200 bg-white text-slate-700 hover:-translate-y-0.5 active:scale-95',
      ].join(' ')}
    >
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? 'Tap the tiles in the right order.'}
        </div>
      </div>

      {/* Ordered slots with end labels */}
      {(spec.startLabel || spec.endLabel) && (
        <div className="flex items-center justify-between px-1 text-xs font-black uppercase tracking-wide text-violet-400">
          <span>← {spec.startLabel ?? 'First'}</span>
          <span>{spec.endLabel ?? 'Last'} →</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {slots.map((id, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            {id ? (
              tile(itemById[id].label, itemById[id].emoji, { wrong: wrongSlots.has(idx), onClick: () => removeAt(idx) })
            ) : (
              tile(String(idx + 1), undefined, { ghost: true })
            )}
            <span className="text-[10px] font-bold text-slate-300">{idx + 1}</span>
          </div>
        ))}
      </div>

      {/* Tray */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-3">
        <div className="mb-2 text-center text-xs font-black uppercase tracking-wider text-slate-400">
          {solved ? 'Perfect order! 🎉' : 'Tap in order'}
        </div>
        <div className="flex min-h-[64px] flex-wrap items-center justify-center gap-3">
          {trayItems.map((it) => (
            <div key={it.id}>{tile(it.label, it.emoji, { onClick: () => placeNext(it.id) })}</div>
          ))}
          {trayItems.length === 0 && !solved && <span className="py-3 text-sm font-semibold text-slate-400">Checking…</span>}
        </div>
      </div>

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center text-lg font-black text-emerald-600">
          ✨ In perfect order! ✨
        </div>
      )}
    </div>
  );
}
