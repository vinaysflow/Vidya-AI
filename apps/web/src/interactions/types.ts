/**
 * Interaction Primitives — the data contract for game-based learning.
 *
 * THESIS: across the whole K–12 curriculum there are only ~8 *interaction
 * verbs*, even though the content is infinite. We build each verb ONCE as a
 * reusable, subject-agnostic primitive; every concept (any subject, any grade)
 * is then expressed as a `InteractionSpec` — pure data fed into a primitive.
 *
 * Subject and grade are therefore *inputs* (content + difficulty parameters),
 * never new codebases. This is what makes the engine a curriculum delivery
 * method rather than a single-subject toy.
 *
 * Authoring flow:
 *   Concept/QuestionTemplate (any subject) ──► InteractionSpec (this schema)
 *      ──► InteractionRenderer picks the primitive ──► child plays ──►
 *   InteractionResult flows back to the Socratic engine + learner model.
 */

/** The eight interaction verbs. Only some have components today; the rest fall
 *  back to choice cards until their primitive ships. */
export type InteractionKind =
  | 'sort_categorize' // drag items into bins/sets        (math sets, classify organisms, parts of speech)
  | 'equal_groups' // fill N groups with M each           (multiplication, division, "how many in all")
  | 'order_sequence' // arrange items into the right order (number order, story events, timeline, code lines)
  | 'match_connect' // link pairs across two columns       (word↔definition, equation↔graph, cause↔effect)
  | 'partition_split' // cut a whole into parts            (fractions, syllables, budget shares)
  | 'build_compose' // assemble pieces into a structure    (arrays/area, build a sentence, molecule)
  | 'place_on_scale' // position item(s) on a line/scale   (number line, timeline, pH, persuasiveness 1–5)
  | 'label_hotspot' // tag regions of an image/text        (label a diagram, find the metaphor, spot the bug)
  | 'complete_pattern'; // fill the gap in a pattern/cloze (missing number, cloze passage, missing token)

/** Representation channel — mirrors the learner-model's channel taxonomy so the
 *  tutorDirector can pick a primitive that matches how a kid learns best. */
export type Channel = 'manipulative' | 'visual' | 'symbolic' | 'story';

/** Fields every interaction shares, regardless of subject or verb. */
export interface InteractionBase {
  /** Stable id for telemetry + result correlation. */
  id: string;
  kind: InteractionKind;
  /** The mission shown to the child (one clear goal). */
  prompt: string;
  /** Short how-to, e.g. "Drag each animal into the right box." */
  instruction?: string;
  /** Content tagging — all optional so any author can supply what they have. */
  subject?: string;
  gradeLevel?: number;
  conceptKey?: string;
  /** A misconception this activity targets (links to the learner-model ledger). */
  targetMisconceptionId?: string;
  /** The representation channel this primitive exercises. */
  channel?: Channel;
  /** Optional theme hook (e.g. quest chapter) for skinning. */
  theme?: string;
}

// ─── 1. Sort / Categorize ────────────────────────────────────────────────────
export interface SortBin {
  id: string;
  label: string;
  emoji?: string;
  /** Optional coaching shown if the child is stuck on this bin. */
  hint?: string;
}
export interface SortToken {
  id: string;
  label: string;
  emoji?: string;
  /** id of the bin this token belongs in (the win condition). */
  correctBinId: string;
  /** Optional: the misconception revealed if mis-sorted to a specific bin. */
  misconceptionByBinId?: Record<string, string>;
}
export interface SortCategorizeSpec extends InteractionBase {
  kind: 'sort_categorize';
  bins: SortBin[];
  tokens: SortToken[];
  /** Allow more than one token per bin (default true). */
  allowMultiplePerBin?: boolean;
  /** Shuffle token order on render (default true). */
  shuffle?: boolean;
}

// ─── 1b. Equal Groups ────────────────────────────────────────────────────────
// The manipulative behind multiplication/division: build N groups of M and watch
// the total emerge. Turns "4 baskets × 6 apples" from a quiz into a thing you build.
export interface EqualGroupsSpec extends InteractionBase {
  kind: 'equal_groups';
  /** Number of groups/containers (the multiplier). */
  groups: number;
  /** Items that go in each group (the multiplicand). */
  perGroup: number;
  /** The product the child is building toward (groups × perGroup). */
  total: number;
  /** Emoji for the item being grouped, e.g. 🍎. */
  itemEmoji: string;
  /** Emoji shown as the container header, e.g. 🧺. */
  containerEmoji?: string;
  /** Singular noun for the container, e.g. "basket". */
  containerLabel?: string;
}

// ─── 2. Order / Sequence ─────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  label: string;
  emoji?: string;
  /** 0-based correct position. */
  correctIndex: number;
}
export interface OrderSequenceSpec extends InteractionBase {
  kind: 'order_sequence';
  items: OrderItem[];
  /** Visual orientation of the track. */
  orientation?: 'horizontal' | 'vertical';
  /** Optional labels for the ends, e.g. "First" / "Last", "Smallest" / "Largest". */
  startLabel?: string;
  endLabel?: string;
}

// ─── 3. Match / Connect ──────────────────────────────────────────────────────
export interface MatchPair {
  id: string;
  left: { label: string; emoji?: string };
  right: { label: string; emoji?: string };
}
export interface MatchConnectSpec extends InteractionBase {
  kind: 'match_connect';
  pairs: MatchPair[];
  /** Shuffle the right column (default true). */
  shuffleRight?: boolean;
}

// ─── 4. Partition / Split ────────────────────────────────────────────────────
export interface PartitionSplitSpec extends InteractionBase {
  kind: 'partition_split';
  /** Total equal parts to divide the whole into. */
  denominator: number;
  /** Parts the child must select/shade. */
  numerator: number;
  /** Shape of the whole. */
  shape?: 'bar' | 'circle';
}

// ─── 5. Build / Compose ──────────────────────────────────────────────────────
export interface BuildPiece {
  id: string;
  label: string;
  emoji?: string;
}
export interface BuildComposeSpec extends InteractionBase {
  kind: 'build_compose';
  pieces: BuildPiece[];
  /** Ordered ids that form a correct construction (e.g. a sentence, a sequence). */
  solution: string[];
  /** For arrays/area: rows × cols target. */
  grid?: { rows: number; cols: number };
}

// ─── 6. Place on a Scale / Line ──────────────────────────────────────────────
export interface PlaceItem {
  id: string;
  label: string;
  /** Correct value along the scale. */
  value: number;
}
export interface PlaceOnScaleSpec extends InteractionBase {
  kind: 'place_on_scale';
  min: number;
  max: number;
  /** Tick step for snapping; omit for continuous. */
  step?: number;
  items: PlaceItem[];
  /** Tolerance (in value units) for a placement to count as correct. */
  tolerance?: number;
  unitLabel?: string;
}

// ─── 7. Label / Hotspot ──────────────────────────────────────────────────────
export interface Hotspot {
  id: string;
  label: string;
  /** Normalized 0..1 target region on the image/text. */
  x: number;
  y: number;
  radius?: number;
}
export interface LabelHotspotSpec extends InteractionBase {
  kind: 'label_hotspot';
  /** Background image URL or a text passage to tag. */
  imageUrl?: string;
  passage?: string;
  hotspots: Hotspot[];
}

// ─── 8. Complete the Pattern / Cloze ─────────────────────────────────────────
export interface CompletePatternSpec extends InteractionBase {
  kind: 'complete_pattern';
  /** Sequence with nulls marking blanks the child fills. */
  sequence: Array<string | null>;
  /** Candidate tiles to place into the blanks. */
  options: Array<{ id: string; label: string; emoji?: string }>;
  /** Correct tile id per blank index (in order of the nulls). */
  solution: string[];
}

/** The discriminated union every author/component speaks. */
export type InteractionSpec =
  | SortCategorizeSpec
  | EqualGroupsSpec
  | OrderSequenceSpec
  | MatchConnectSpec
  | PartitionSplitSpec
  | BuildComposeSpec
  | PlaceOnScaleSpec
  | LabelHotspotSpec
  | CompletePatternSpec;

/**
 * The structured outcome a primitive emits when the child finishes. This is the
 * single object the Socratic engine + learner model consume — it carries the
 * same signals the choice-card path produces (correct, misconception) plus
 * richer per-action detail.
 */
export interface InteractionResult {
  specId: string;
  kind: InteractionKind;
  /** Did the child reach the win condition? */
  correct: boolean;
  /** 0..1 — partial credit (e.g. fraction of tokens sorted right on first try). */
  score: number;
  /** How many full check attempts it took. */
  attempts: number;
  durationMs: number;
  /** Misconception ids the child's actions revealed (feeds the ledger). */
  misconceptionIds?: string[];
  /** Verb-specific detail (placements, order, etc.) for analytics/replay. */
  detail?: Record<string, unknown>;
}

/** Props every interaction component receives. Keeps primitives swappable. */
export interface InteractionComponentProps<S extends InteractionSpec = InteractionSpec> {
  spec: S;
  /** Called once the child completes (success or graded attempt). */
  onComplete: (result: InteractionResult) => void;
  /** Fired on every meaningful action for live game-feel hooks (sound, RM mood). */
  onSignal?: (signal: 'pick_up' | 'drop_correct' | 'drop_wrong' | 'all_placed') => void;
}
