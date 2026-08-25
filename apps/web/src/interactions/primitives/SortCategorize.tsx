import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InteractionComponentProps,
  SortCategorizeSpec,
  SortToken,
} from '../types';

/**
 * Sort / Categorize — the first game-based-learning primitive.
 *
 * The child drags tokens into bins. This single component powers math (even/odd,
 * sets), science (living/non-living), ELA (noun/verb) and more — only the spec
 * data changes. Built for touch + mouse with native pointer events (no deps),
 * with the juice that makes it feel like a game, not a quiz:
 *   • pick-up lifts + scales the token, casts a shadow
 *   • bins glow + scale when a token hovers over them
 *   • correct drop = pop + sparkle; wrong = shake + bounce back to the tray
 *   • finishing all-correct fires a celebratory burst
 */

const TRAY = '__tray__';

type Placement = Record<string, string>; // tokenId -> binId | TRAY

interface DragState {
  tokenId: string;
  // pointer position (viewport)
  x: number;
  y: number;
  // grab offset within the chip so it doesn't snap to the cursor's corner
  dx: number;
  dy: number;
  w: number;
  h: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function SortCategorize({ spec, onComplete, onSignal }: InteractionComponentProps<SortCategorizeSpec>) {
  const tokens = useMemo(
    () => (spec.shuffle === false ? spec.tokens : shuffleArray(spec.tokens)),
    [spec.tokens, spec.shuffle],
  );

  const [placement, setPlacement] = useState<Placement>(() => {
    const init: Placement = {};
    for (const t of tokens) init[t.id] = TRAY;
    return init;
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverBin, setHoverBin] = useState<string | null>(null);
  const [wrongTokens, setWrongTokens] = useState<Set<string>>(new Set());
  const [correctTokens, setCorrectTokens] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [popBin, setPopBin] = useState<string | null>(null);

  const startedAt = useRef<number>(Date.now());
  const binRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tokenById = useMemo(() => {
    const m: Record<string, SortToken> = {};
    for (const t of spec.tokens) m[t.id] = t;
    return m;
  }, [spec.tokens]);

  // ─── Drag: pointer move/up listeners live on window so dragging is smooth
  //     even when the pointer leaves the chip. ──────────────────────────────
  const dropToken = useCallback(
    (tokenId: string, clientX: number, clientY: number) => {
      let target: string | null = null;
      for (const bin of spec.bins) {
        const el = binRefs.current[bin.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          target = bin.id;
          break;
        }
      }
      if (target) {
        setPlacement((p) => ({ ...p, [tokenId]: target as string }));
        setPopBin(target);
        window.setTimeout(() => setPopBin(null), 280);
        onSignal?.('drop_correct'); // "landed in a bin" — not graded yet
      }
      // if no bin hit, token stays where it was (placement unchanged)
    },
    [spec.bins, onSignal],
  );

  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      // live bin hover highlight
      let over: string | null = null;
      for (const bin of spec.bins) {
        const el = binRefs.current[bin.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          over = bin.id;
          break;
        }
      }
      setHoverBin(over);
    };
    const handleUp = (e: PointerEvent) => {
      dropToken(drag.tokenId, e.clientX, e.clientY);
      setDrag(null);
      setHoverBin(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [drag, spec.bins, dropToken]);

  const beginDrag = (token: SortToken, e: React.PointerEvent<HTMLButtonElement>) => {
    if (solved) return;
    const r = e.currentTarget.getBoundingClientRect();
    // clear any prior wrong/correct flag for this token when re-grabbed
    setWrongTokens((s) => {
      if (!s.has(token.id)) return s;
      const next = new Set(s);
      next.delete(token.id);
      return next;
    });
    setDrag({
      tokenId: token.id,
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      w: r.width,
      h: r.height,
    });
    onSignal?.('pick_up');
  };

  const allPlaced = tokens.every((t) => placement[t.id] !== TRAY);

  // ─── Grade once everything is placed. Productive struggle: wrong tokens
  //     shake then bounce back to the tray; correct ones lock in. ───────────
  useEffect(() => {
    if (!allPlaced || solved) return;
    onSignal?.('all_placed');
    const correct = new Set<string>();
    const wrong = new Set<string>();
    const misconceptionIds: string[] = [];
    for (const t of tokens) {
      const placedIn = placement[t.id];
      if (placedIn === t.correctBinId) {
        correct.add(t.id);
      } else {
        wrong.add(t.id);
        const mc = t.misconceptionByBinId?.[placedIn];
        if (mc) misconceptionIds.push(mc);
      }
    }
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);
    setCorrectTokens(correct);

    if (wrong.size === 0) {
      setSolved(true);
      onSignal?.('drop_correct');
      onComplete({
        specId: spec.id,
        kind: 'sort_categorize',
        correct: true,
        score: 1,
        attempts: attemptNo,
        durationMs: Date.now() - startedAt.current,
        misconceptionIds: [],
        detail: { placement, firstTryCorrect: attemptNo === 1 },
      });
      return;
    }

    // show wrong markers, then send wrong tokens home for another try
    setWrongTokens(wrong);
    onSignal?.('drop_wrong');
    const score = correct.size / tokens.length;
    // Report the graded attempt (engine/learner-model gets the misconception signal)
    onComplete({
      specId: spec.id,
      kind: 'sort_categorize',
      correct: false,
      score,
      attempts: attemptNo,
      durationMs: Date.now() - startedAt.current,
      misconceptionIds,
      detail: { placement, wrong: [...wrong] },
    });
    const t = window.setTimeout(() => {
      setPlacement((p) => {
        const next = { ...p };
        for (const id of wrong) next[id] = TRAY;
        return next;
      });
      setWrongTokens(new Set());
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaced, solved]);

  const draggingToken = drag ? tokenById[drag.tokenId] : null;
  const trayTokens = tokens.filter((t) => placement[t.id] === TRAY && (!drag || drag.tokenId !== t.id));

  const renderChip = (token: SortToken, opts?: { state?: 'correct' | 'wrong' }) => (
    <button
      key={token.id}
      type="button"
      onPointerDown={(e) => beginDrag(token, e)}
      disabled={solved}
      className={[
        'group relative flex select-none items-center gap-2 rounded-2xl px-4 py-3 text-base font-extrabold',
        'border-2 shadow-[0_4px_0_rgba(0,0,0,0.12)] transition-transform touch-none',
        'active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.12)]',
        opts?.state === 'correct'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : opts?.state === 'wrong'
            ? 'animate-[wrongShake_0.4s_ease] border-rose-300 bg-rose-50 text-rose-700'
            : 'border-violet-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-violet-300 cursor-grab',
        drag?.tokenId === token.id ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      {token.emoji && <span className="text-2xl leading-none">{token.emoji}</span>}
      <span>{token.label}</span>
      {opts?.state === 'correct' && <span className="ml-1 text-lg">✓</span>}
      {opts?.state === 'wrong' && <span className="ml-1 text-lg">✕</span>}
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Mission */}
      <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
        <div className="text-xs font-black uppercase tracking-wider text-amber-500">🎯 Mission</div>
        <div className="mt-1 text-lg font-extrabold text-slate-800">{spec.prompt}</div>
        {spec.instruction && <div className="mt-1 text-sm font-semibold text-amber-700/80">{spec.instruction}</div>}
      </div>

      {/* Bins */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(spec.bins.length, 3)}, minmax(0, 1fr))` }}
      >
        {spec.bins.map((bin) => {
          const placed = tokens.filter((t) => placement[t.id] === bin.id);
          const isHover = hoverBin === bin.id && !!drag;
          const isPop = popBin === bin.id;
          return (
            <div
              key={bin.id}
              ref={(el) => (binRefs.current[bin.id] = el)}
              className={[
                'flex min-h-[150px] flex-col rounded-3xl border-[3px] border-dashed p-3 transition-all duration-150',
                isHover
                  ? 'scale-[1.03] border-violet-400 bg-violet-50 shadow-[0_0_0_4px_rgba(167,139,250,0.25)]'
                  : 'border-slate-200 bg-slate-50',
                isPop ? 'animate-[scorePop_0.3s_ease]' : '',
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-center gap-2 text-center text-sm font-black uppercase tracking-wide text-slate-500">
                {bin.emoji && <span className="text-xl">{bin.emoji}</span>}
                {bin.label}
              </div>
              <div className="flex flex-1 flex-wrap content-start items-start justify-center gap-2">
                {placed.map((t) =>
                  renderChip(t, {
                    state: correctTokens.has(t.id)
                      ? 'correct'
                      : wrongTokens.has(t.id)
                        ? 'wrong'
                        : undefined,
                  }),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tray */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-3">
        <div className="mb-2 text-center text-xs font-black uppercase tracking-wider text-slate-400">
          {solved ? 'Nice sorting! 🎉' : 'Drag these into the right box'}
        </div>
        <div className="flex min-h-[64px] flex-wrap items-center justify-center gap-3">
          {trayTokens.length === 0 && !solved && (
            <div className="py-3 text-sm font-semibold text-slate-400">Checking…</div>
          )}
          {trayTokens.map((t) => renderChip(t))}
        </div>
      </div>

      {/* Floating drag chip — follows the pointer */}
      {drag && draggingToken && (
        <div
          className="pointer-events-none fixed z-50 flex scale-110 items-center gap-2 rounded-2xl border-2 border-violet-300 bg-white px-4 py-3 text-base font-extrabold text-slate-800 shadow-2xl"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, height: drag.h }}
        >
          {draggingToken.emoji && <span className="text-2xl leading-none">{draggingToken.emoji}</span>}
          <span>{draggingToken.label}</span>
        </div>
      )}

      {solved && (
        <div className="animate-[scorePop_0.4s_ease] rounded-3xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center text-lg font-black text-emerald-600">
          ✨ Solved in {attempts} {attempts === 1 ? 'try' : 'tries'}! ✨
        </div>
      )}
    </div>
  );
}
