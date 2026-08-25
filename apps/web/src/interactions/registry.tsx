import type { ComponentType } from 'react';
import type {
  InteractionComponentProps,
  InteractionKind,
  InteractionResult,
  InteractionSpec,
} from './types';
import { SortCategorize } from './primitives/SortCategorize';
import { EqualGroups } from './primitives/EqualGroups';
import { PartitionSplit } from './primitives/PartitionSplit';
import { PlaceOnScale } from './primitives/PlaceOnScale';
import { CompletePattern } from './primitives/CompletePattern';
import { OrderSequence } from './primitives/OrderSequence';
import { MatchConnect } from './primitives/MatchConnect';

/**
 * The primitive registry. Maps each interaction verb to the React component
 * that plays it. Adding a new game = author the spec type + register here.
 *
 * Verbs without a component yet are intentionally absent — `InteractionRenderer`
 * falls back to choice cards so the curriculum is never blocked on UI work.
 */
const REGISTRY: Partial<Record<InteractionKind, ComponentType<InteractionComponentProps<any>>>> = {
  sort_categorize: SortCategorize,
  equal_groups: EqualGroups,
  partition_split: PartitionSplit,
  place_on_scale: PlaceOnScale,
  complete_pattern: CompletePattern,
  order_sequence: OrderSequence,
  match_connect: MatchConnect,
  // build_compose:    BuildCompose,     // ← future primitives plug in here
  // label_hotspot:    LabelHotspot,
};

export function hasPrimitive(kind: InteractionKind): boolean {
  return Boolean(REGISTRY[kind]);
}

interface RendererProps {
  spec: InteractionSpec;
  onComplete: (result: InteractionResult) => void;
  onSignal?: InteractionComponentProps['onSignal'];
  /** Rendered when no primitive exists for this verb yet (e.g. the existing
   *  choice-card flow). Keeps the curriculum playable end-to-end. */
  fallback?: (spec: InteractionSpec) => JSX.Element;
}

/**
 * Picks the right primitive for a spec, or degrades gracefully to a fallback.
 * This is the single integration point the GameScene/engine renders against.
 */
export function InteractionRenderer({ spec, onComplete, onSignal, fallback }: RendererProps) {
  const Primitive = REGISTRY[spec.kind];
  if (Primitive) {
    return <Primitive spec={spec} onComplete={onComplete} onSignal={onSignal} />;
  }
  if (fallback) return fallback(spec);
  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-2xl">🚧</div>
      <div className="mt-2 text-sm font-bold text-slate-500">
        “{spec.kind}” doesn’t have a game yet — coming soon.
      </div>
      <div className="mt-1 text-xs text-slate-400">{spec.prompt}</div>
    </div>
  );
}
