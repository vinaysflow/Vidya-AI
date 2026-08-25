import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InteractionComponentProps, PlaceItem, PlaceOnScaleSpec } from '../types';

/**
 * Place on a Scale / Number Line — drag a marker to where a value belongs.
 *
 * Powers number-line placement, rounding intuition, ordering, timelines, and any
 * "where does this go on a scale?" task. Touch + mouse via pointer events;
 * markers snap to `step` and count as correct within `tolerance` of the target.
 */

const TRAY = Number.NaN; // sentinel: marker not yet placed

interface DragState {
  itemId: string;
  x: number;
  y: number;
}

export function PlaceOnScale({ spec, onComplete, onSignal }: InteractionComponentProps<PlaceOnScaleSpec>) {
  const { min, max, items } = spec;
  const step = spec.step ?? (max - min <= 20 ? 1 : (max - min) / 20);
  const tolerance = spec.tolerance ?? step / 2 + 1e-9;

  const [placed, setPlaced] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const it of items) init[it.id] = TRAY;
    return init;
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startedAt = useRef<number>(Date.now());

  const itemById = useMemo(() => {
    const m: Record<string, PlaceItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  const valueToPct = (v: number) => ((v - min) / (max - min)) * 100;
  const snap = (v: number) => {
    const snapped = Math.round((v - min) / step) * step + min;
    return Math.min(max, Math.max(min, snapped));
  };
  const xToValue = (clientX: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const pct = (clientX - r.left) / r.width;
    return snap(min + pct * (max - min));
  };
  const overTrack = (clientX: number, clientY: number): boolean => {
    const el = trackRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top - 70 && clientY <= r.bottom + 70;
  };

  const evaluate = useCallback(
    (next: Record<string, number>) => {
      const allPlaced = items.every((it) => !Number.isNaN(next[it.id]));
      if (!allPlaced) return;
      const allRight = items.every((it) => Math.abs(next[it.id] - it.value) <= tolerance);
      setAttempts((a) => a + 1);
      onSignal?.('all_placed');
      if (allRight) {
        setSolved(true);
        onSignal?.('drop_correct');
        onComplete({
          specId: spec.id,
          kind: 'place_on_scale',
          correct: true,
          score: 1,
          attempts: attempts + 1,
          durationMs: Date.now() - startedAt.current,
          misconceptionIds: [],
          detail: { placed: next },
        });
      } else {
        onSignal?.('drop_wrong');
      }
    },
    [items, tolerance, onComplete, onSignal, spec.id, attempts],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const id = drag.itemId;
      if (overTrack(e.clientX, e.clientY)) {
        const v = xToValue(e.clientX);
        if (v != null) {
          setPlaced((p) => {
            const next = { ...p, [id]: v };
            window.setTimeout(() => evaluate(next), 0);
            return next;
          });
        }
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, evaluate]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (itemId: string, e: React.PointerEvent) => {
    if (solved) return;
    setDrag({ itemId, x: e.clientX, y: e.clientY });
    onSignal?.('pick_up');
  };

  const trayItems = items.filter((it) => Number.isNaN(placed[it.id]) && (!drag || drag.itemId !== it.id));
  const placedItems = items.filter((it) => !Number.isNaN(placed[it.id]));

  // Tick marks: integers if the range is small, else ~10 evenly spaced.
  const ticks = useMemo(() => {
    const span = max - min;
    const count = span <= 20 ? span : 10;
    const out: number[] = [];
    for (let i = 0; i <= count; i++) out.push(min + (span * i) / count);
    return out;
  }, [min, max]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        <div className="mt-1 text-sm font-semibold text-amber-700/80">
          {spec.instruction ?? 'Drag each number to where it belongs on the line.'}
        </div>
      </div>

      {/* The number line */}
      <div className="px-2 pt-10 pb-2">
        <div ref={trackRef} className="relative h-2 w-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-300">
          {/* end caps */}
          <span className="absolute -left-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-violet-400" />
          <span className="absolute -right-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-fuchsia-400" />
          {/* ticks */}
          {ticks.map((t, i) => (
            <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${valueToPct(t)}%` }}>
              <div className="h-3 w-0.5 -translate-x-1/2 bg-violet-400" />
              <div className="mt-1 -translate-x-1/2 text-[10px] font-bold text-slate-400 tabular-nums">
                {Number.isInteger(t) ? t : t.toFixed(0)}
              </div>
            </div>
          ))}
          {/* placed markers */}
          {placedItems.map((it) => {
            const v = placed[it.id];
            const right = Math.abs(v - it.value) <= tolerance;
            return (
              <button
                key={it.id}
                type="button"
                onPointerDown={(e) => begin(it.id, e)}
                disabled={solved}
                className="absolute -top-9 -translate-x-1/2 touch-none"
                style={{ left: `${valueToPct(v)}%` }}
              >
                <div
                  className={[
                    'rounded-xl px-2.5 py-1 text-sm font-black text-white shadow-lg transition-colors',
                    solved
                      ? 'bg-emerald-500'
                      : right
                        ? 'bg-emerald-500'
                        : 'bg-rose-500 animate-[wrongShake_0.4s_ease]',
                  ].join(' ')}
                >
                  {it.label}
                </div>
                <div className="mx-auto h-3 w-0.5 bg-slate-400" />
              </button>
            );
          })}
        </div>
        {spec.unitLabel && <div className="mt-6 text-center text-xs font-semibold text-slate-400">{spec.unitLabel}</div>}
      </div>

      {/* Tray of markers to place */}
      {trayItems.length > 0 && (
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-3">
          <div className="mb-2 text-center text-xs font-black uppercase tracking-wider text-slate-400">
            Drag onto the line
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {trayItems.map((it) => (
              <button
                key={it.id}
                type="button"
                onPointerDown={(e) => begin(it.id, e)}
                disabled={solved}
                className="cursor-grab touch-none rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-lg font-black text-violet-700 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px]"
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating drag chip */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-violet-300 bg-white px-4 py-3 text-lg font-black text-violet-700 shadow-2xl"
          style={{ left: drag.x, top: drag.y }}
        >
          {itemById[drag.itemId]?.label}
        </div>
      )}

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center text-lg font-black text-emerald-600">
          ✨ Right where it belongs! ✨
        </div>
      )}
    </div>
  );
}
