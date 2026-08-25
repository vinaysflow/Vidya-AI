import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { InteractionRenderer } from './registry';
import type {
  CompletePatternSpec,
  EqualGroupsSpec,
  InteractionResult,
  MatchConnectSpec,
  OrderSequenceSpec,
  PartitionSplitSpec,
  PlaceOnScaleSpec,
  SortCategorizeSpec,
} from './types';

/**
 * Interaction Lab — the proof that ONE primitive (Sort/Categorize) delivers the
 * SAME game across different subjects and grades. Only the spec data changes.
 *
 * This is the playable artifact: it shows the data contract → registry →
 * primitive → result loop end to end, and it's the experience we build the rest
 * of the curriculum on. Open at /proto/interactions.
 */

// ─── Sample specs: same verb, three subjects. Authors would generate these ───
const MATH_EVEN_ODD: SortCategorizeSpec = {
  id: 'demo-math-even-odd',
  kind: 'sort_categorize',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'parity',
  channel: 'manipulative',
  prompt: 'Sort each number into Even or Odd.',
  instruction: 'Drag each number into the right box.',
  bins: [
    { id: 'even', label: 'Even', emoji: '🟦' },
    { id: 'odd', label: 'Odd', emoji: '🟥' },
  ],
  tokens: [
    { id: 'n7', label: '7', correctBinId: 'odd' },
    { id: 'n12', label: '12', correctBinId: 'even' },
    { id: 'n5', label: '5', correctBinId: 'odd' },
    { id: 'n20', label: '20', correctBinId: 'even' },
    { id: 'n3', label: '3', correctBinId: 'odd' },
    { id: 'n8', label: '8', correctBinId: 'even' },
  ],
};

const SCIENCE_LIVING: SortCategorizeSpec = {
  id: 'demo-science-living',
  kind: 'sort_categorize',
  subject: 'Science',
  gradeLevel: 4,
  conceptKey: 'living-vs-nonliving',
  channel: 'visual',
  prompt: 'Which of these are living things?',
  instruction: 'Drag each one into Living or Non-living.',
  bins: [
    { id: 'living', label: 'Living', emoji: '🌿' },
    { id: 'nonliving', label: 'Non-living', emoji: '🪨' },
  ],
  tokens: [
    { id: 'dog', label: 'Dog', emoji: '🐶', correctBinId: 'living' },
    { id: 'rock', label: 'Rock', emoji: '🪨', correctBinId: 'nonliving' },
    { id: 'tree', label: 'Tree', emoji: '🌳', correctBinId: 'living' },
    { id: 'car', label: 'Car', emoji: '🚗', correctBinId: 'nonliving' },
    { id: 'fish', label: 'Fish', emoji: '🐟', correctBinId: 'living' },
    { id: 'cup', label: 'Cup', emoji: '☕', correctBinId: 'nonliving' },
  ],
};

const ELA_PARTS_OF_SPEECH: SortCategorizeSpec = {
  id: 'demo-ela-pos',
  kind: 'sort_categorize',
  subject: 'English Language Arts',
  gradeLevel: 5,
  conceptKey: 'parts-of-speech',
  channel: 'symbolic',
  prompt: 'Is each word a Noun or a Verb?',
  instruction: 'Drag each word into the right box.',
  bins: [
    { id: 'noun', label: 'Noun', emoji: '🧱' },
    { id: 'verb', label: 'Verb', emoji: '⚡' },
  ],
  tokens: [
    { id: 'run', label: 'run', correctBinId: 'verb' },
    { id: 'dog', label: 'dog', correctBinId: 'noun' },
    { id: 'jump', label: 'jump', correctBinId: 'verb' },
    { id: 'river', label: 'river', correctBinId: 'noun' },
    { id: 'sing', label: 'sing', correctBinId: 'verb' },
    { id: 'mountain', label: 'mountain', correctBinId: 'noun' },
  ],
};

const MATH_EQUAL_GROUPS: EqualGroupsSpec = {
  id: 'demo-math-equal-groups',
  kind: 'equal_groups',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'multiplication-equal-groups',
  channel: 'manipulative',
  prompt: 'There are 4 baskets. Each basket has 6 apples. How many apples are there in all?',
  groups: 4,
  perGroup: 6,
  total: 24,
  itemEmoji: '🍎',
  containerEmoji: '🧺',
  containerLabel: 'basket',
};

const MATH_FRACTION: PartitionSplitSpec = {
  id: 'demo-math-fraction',
  kind: 'partition_split',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'fractions',
  channel: 'visual',
  prompt: 'Shade 3/4 of the bar.',
  numerator: 3,
  denominator: 4,
  shape: 'bar',
};

const MATH_NUMBER_LINE: PlaceOnScaleSpec = {
  id: 'demo-math-number-line',
  kind: 'place_on_scale',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'number-line',
  channel: 'visual',
  prompt: 'Place 47 on the number line.',
  min: 0,
  max: 50,
  step: 5,
  tolerance: 5,
  items: [{ id: 't', label: '47', value: 47 }],
};

const MATH_PATTERN: CompletePatternSpec = {
  id: 'demo-math-pattern',
  kind: 'complete_pattern',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'patterns',
  channel: 'visual',
  prompt: 'You see a pattern: red, blue, red, blue, red, blue. What color comes next?',
  sequence: ['red', 'blue', 'red', 'blue', 'red', 'blue', null],
  options: [
    { id: 'red', label: 'red' },
    { id: 'blue', label: 'blue' },
  ],
  solution: ['red'],
};

const MATH_ORDER: OrderSequenceSpec = {
  id: 'demo-math-order',
  kind: 'order_sequence',
  subject: 'Mathematics',
  gradeLevel: 4,
  conceptKey: 'order-numbers',
  channel: 'manipulative',
  prompt: 'Order these numbers from least to greatest: 23, 8, 41, 16.',
  items: [
    { id: 'n23', label: '23', correctIndex: 2 },
    { id: 'n8', label: '8', correctIndex: 0 },
    { id: 'n41', label: '41', correctIndex: 3 },
    { id: 'n16', label: '16', correctIndex: 1 },
  ],
  startLabel: 'Smallest',
  endLabel: 'Largest',
};

const SCIENCE_MATCH: MatchConnectSpec = {
  id: 'demo-science-match',
  kind: 'match_connect',
  subject: 'Science',
  gradeLevel: 4,
  conceptKey: 'animal-homes',
  channel: 'visual',
  prompt: 'Match each animal to its home.',
  pairs: [
    { id: 'bee', left: { label: 'Bee', emoji: '🐝' }, right: { label: 'Hive', emoji: '🍯' } },
    { id: 'bird', left: { label: 'Bird', emoji: '🐦' }, right: { label: 'Nest', emoji: '🪺' } },
    { id: 'bear', left: { label: 'Bear', emoji: '🐻' }, right: { label: 'Cave', emoji: '🏔️' } },
    { id: 'fish', left: { label: 'Fish', emoji: '🐟' }, right: { label: 'Reef', emoji: '🪸' } },
  ],
};

const SAMPLES = [
  { key: 'pattern', label: 'Math · Pattern', emoji: '🎨', spec: MATH_PATTERN },
  { key: 'order', label: 'Math · Order', emoji: '🔢', spec: MATH_ORDER },
  { key: 'match', label: 'Science · Match', emoji: '🔗', spec: SCIENCE_MATCH },
  { key: 'groups', label: 'Math · Equal Groups', emoji: '🧺', spec: MATH_EQUAL_GROUPS },
  { key: 'fraction', label: 'Math · Fractions', emoji: '🍫', spec: MATH_FRACTION },
  { key: 'numberline', label: 'Math · Number Line', emoji: '📏', spec: MATH_NUMBER_LINE },
  { key: 'math', label: 'Math · Even/Odd', emoji: '🔢', spec: MATH_EVEN_ODD },
  { key: 'science', label: 'Science · Living', emoji: '🔬', spec: SCIENCE_LIVING },
  { key: 'ela', label: 'ELA · Noun/Verb', emoji: '📖', spec: ELA_PARTS_OF_SPEECH },
] as const;

export function InteractionLab() {
  const [active, setActive] = useState<(typeof SAMPLES)[number]['key']>('pattern');
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [runKey, setRunKey] = useState(0); // forces a fresh mount on replay/switch

  const sample = useMemo(() => SAMPLES.find((s) => s.key === active)!, [active]);

  const switchTo = (key: (typeof SAMPLES)[number]['key']) => {
    setActive(key);
    setResult(null);
    setRunKey((k) => k + 1);
  };

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #faf8ff 0%, #f1ecff 100%)' }}
    >
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/proto" className="text-xs font-bold text-violet-400 hover:underline">
              ← Bake-off
            </Link>
            <h1 className="mt-1 text-2xl font-black text-slate-800">Interaction Lab</h1>
            <p className="text-sm font-semibold text-slate-500">
              One primitive — <span className="text-violet-600">Sort / Categorize</span> — same game,
              three subjects. The math IS the gameplay.
            </p>
          </div>
        </div>

        {/* Subject switcher — proves the cross-curricular thesis */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => switchTo(s.key)}
              className={[
                'rounded-full px-4 py-2 text-sm font-extrabold transition',
                active === s.key
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'bg-white text-slate-600 shadow hover:bg-violet-50',
              ].join(' ')}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* The game */}
        <div className="mt-6 rounded-[28px] border border-violet-100 bg-white p-5 shadow-xl">
          <InteractionRenderer
            key={`${sample.key}-${runKey}`}
            spec={sample.spec}
            onComplete={setResult}
          />
        </div>

        {/* The structured result the engine + learner model receive */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
              Result → engine + learner model
            </h3>
            <button
              type="button"
              onClick={() => switchTo(active)}
              className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-slate-700"
            >
              ↺ Replay
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-emerald-200">
{result ? JSON.stringify(result, null, 2) : '// finish the activity to see the emitted InteractionResult'}
          </pre>
        </div>
      </div>
    </div>
  );
}
