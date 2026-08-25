/**
 * Engine bake-off landing page. Links to both prototypes (same beat, different
 * render engine) and lists the evaluation rubric so the comparison is judged
 * on fixed criteria — ideally on a real low-end tablet, not a laptop.
 */

import { Link } from 'react-router-dom';

const RUBRIC = [
  'Would a kid show a friend? (the whole point)',
  'Perf on a low-end tablet — fps, battery, heat, load time',
  'Customizable-hero feasibility (the Locker)',
  'Solo-dev velocity & maintainability',
  'Accessibility / calm-mode feasibility',
  'Asset-pipeline sustainability without an artist',
];

function Card({
  to,
  title,
  tag,
  notes,
  gradient,
}: {
  to: string;
  title: string;
  tag: string;
  notes: string[];
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl transition hover:scale-[1.02] hover:border-white/25"
    >
      <div className={`h-40 ${gradient}`} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">{tag}</span>
        <h2 className="text-2xl font-extrabold text-white">{title}</h2>
        <ul className="mt-1 space-y-1 text-sm text-violet-100/80">
          {notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
        <span className="mt-3 inline-block text-sm font-semibold text-amber-300 group-hover:underline">
          Open prototype →
        </span>
      </div>
    </Link>
  );
}

export function ProtoIndex() {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #160f30 0%, #241a4d 60%, #3b2a6b 100%)' }}
    >
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-extrabold text-white">Engine bake-off</h1>
        <p className="mt-2 max-w-2xl text-violet-100/80">
          Same beat — a grade-4 fraction-equivalence question, reactive hero, choice cards, and a
          correct-answer celebration — rendered two ways. Only the render engine differs. Feel both,
          ideally on a cheap Android tablet.
        </p>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row">
          <Card
            to="/proto/pixi"
            title="PixiJS"
            tag="2D WebGL · faked 2.5D"
            gradient="bg-gradient-to-br from-cyan-500 to-violet-700"
            notes={['Cheap-device friendly', 'Textured sprites (real strength)', 'Hero = 2D variants']}
          />
          <Card
            to="/proto/r3f"
            title="react-three-fiber"
            tag="true 3D"
            gradient="bg-gradient-to-br from-violet-500 to-amber-500"
            notes={['Real depth & lighting', 'Hero = Ready Player Me + Mixamo path', 'Heavier on tablets']}
          />
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row">
          <Card
            to="/proto/interactions"
            title="Interaction Lab"
            tag="game-based learning · the real bet"
            gradient="bg-gradient-to-br from-emerald-400 via-violet-500 to-amber-400"
            notes={[
              'ONE primitive (Sort) across math · science · ELA',
              'The content IS the gameplay (not a quiz with confetti)',
              'Drag-to-sort with full game-feel · emits a structured result',
            ]}
          />
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6">
          <h3 className="text-lg font-bold text-white">Judge both on this rubric</h3>
          <ol className="mt-3 space-y-1.5 text-sm text-violet-100/85">
            {RUBRIC.map((r, i) => (
              <li key={r}>
                <span className="font-bold text-cyan-300">{i + 1}.</span> {r}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-xs text-violet-200/50">
          Placeholder art is procedural/throwaway. This tests engine feel — motion, depth,
          responsiveness, particles — not final art.
        </p>
      </div>
    </div>
  );
}
