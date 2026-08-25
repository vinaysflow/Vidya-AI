/**
 * BeatOverlay — the shared DOM chrome layered over each engine canvas.
 *
 * Identical for both prototypes: quest prompt, Vidya's line, the 3 choice
 * cards, and the complete/replay control. The reactive HERO lives inside the
 * engine canvas (Pixi sprite / 3D model) — that's the differentiator. Keeping
 * the chrome shared guarantees the bake-off compares only the render layer.
 */

import { Link } from 'react-router-dom';
import { BEAT, VIDYA_LINES, type BeatPhase, type UseBeatResult } from './beat';

const CHOICE_COLORS = [
  'from-cyan-400 to-cyan-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-500',
];

interface BeatOverlayProps {
  engineLabel: string;
  beat: UseBeatResult;
}

export function BeatOverlay({ engineLabel, beat }: BeatOverlayProps) {
  const { phase, selectedId, pick, reset, combo } = beat;
  const locked: BeatPhase[] = ['thinking', 'correct', 'complete'];
  const isLocked = locked.includes(phase);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      {/* Top bar: engine label + quest prompt */}
      <div className="pointer-events-auto flex items-center justify-between px-4 pt-4">
        <Link
          to="/proto"
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur transition hover:bg-white/20"
        >
          ← Bake-off
        </Link>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200 backdrop-blur">
          {engineLabel}
        </span>
      </div>

      <div className="px-4 pt-3">
        <div className="mx-auto max-w-md rounded-2xl border-2 border-amber-300/60 bg-amber-100/95 px-5 py-3 shadow-xl">
          <p className="text-center text-lg font-bold text-amber-900">{BEAT.prompt}</p>
        </div>
      </div>

      <div className="flex-1" />

      {/* Vidya's line */}
      <div className="px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-center shadow-lg backdrop-blur">
          <p className="text-base font-medium text-violet-50">{VIDYA_LINES[phase]}</p>
        </div>
      </div>

      {/* Choice cards / complete control */}
      <div className="pointer-events-auto px-4 pb-6 pt-3">
        {phase === 'complete' ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="text-center text-sm font-semibold text-emerald-300">
              ★ Combo {combo} · Quest complete
            </div>
            <button
              onClick={reset}
              className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition active:scale-95"
            >
              Play again
            </button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
            {BEAT.choices.map((c, i) => {
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  disabled={isLocked}
                  onClick={() => pick(c.id)}
                  className={[
                    'relative overflow-hidden rounded-2xl bg-gradient-to-b px-3 py-5 text-2xl font-extrabold text-white shadow-lg transition',
                    CHOICE_COLORS[i % CHOICE_COLORS.length],
                    isLocked ? 'opacity-50' : 'active:scale-95 hover:brightness-110',
                    isSelected && phase === 'wrong' ? 'ring-4 ring-rose-300' : '',
                    isSelected && phase === 'correct' ? 'ring-4 ring-emerald-300' : '',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
