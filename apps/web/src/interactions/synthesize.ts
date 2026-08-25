import type {
  CompletePatternSpec,
  EqualGroupsSpec,
  InteractionSpec,
  OrderSequenceSpec,
  PartitionSplitSpec,
  PlaceOnScaleSpec,
  SortCategorizeSpec,
} from './types';

/**
 * synthesizeInteraction — turn a quest's word problem into a playable
 * manipulative, deterministically and on the client.
 *
 * This is the bridge that lets the EXISTING curriculum (plain-text word
 * problems) become game-based learning today, without waiting on the engine to
 * emit specs. When a problem doesn't match a known shape we return null and the
 * caller falls back to choice cards — so nothing ever breaks.
 *
 * Coverage today: equal-groups / multiplication ("N <containers>, each has M
 * <items> … how many in all"), the most common grade-4 structure. More verbs
 * plug in below as their primitives ship.
 */

// noun (singular or plural-ish) → emoji. Falls back to a neutral token.
const ITEM_EMOJI: Record<string, string> = {
  apple: '🍎', apples: '🍎',
  orange: '🍊', oranges: '🍊',
  banana: '🍌', bananas: '🍌',
  cookie: '🍪', cookies: '🍪',
  candy: '🍬', candies: '🍬',
  egg: '🥚', eggs: '🥚',
  flower: '🌸', flowers: '🌸',
  star: '⭐', stars: '⭐',
  ball: '⚽', balls: '⚽',
  pencil: '✏️', pencils: '✏️',
  book: '📕', books: '📕',
  coin: '🪙', coins: '🪙',
  fish: '🐟', marble: '🔵', marbles: '🔵',
  sticker: '🌟', stickers: '🌟',
};
const CONTAINER_EMOJI: Record<string, string> = {
  basket: '🧺', baskets: '🧺',
  box: '📦', boxes: '📦',
  bag: '🛍️', bags: '🛍️',
  plate: '🍽️', plates: '🍽️',
  jar: '🫙', jars: '🫙',
  shelf: '🗄️', shelves: '🗄️',
  row: '➖', rows: '➖',
  group: '⭕', groups: '⭕',
  bucket: '🪣', buckets: '🪣',
  vase: '🏺', vases: '🏺',
  cage: '🔲', cages: '🔲', tank: '🐠', tanks: '🐠',
};

function singular(noun: string): string {
  const n = noun.toLowerCase();
  if (n.endsWith('ies')) return n.slice(0, -3) + 'y';
  if (n.endsWith('es') && (n.endsWith('ches') || n.endsWith('shes') || n.endsWith('xes'))) return n.slice(0, -2);
  if (n.endsWith('s') && n.length > 3) return n.slice(0, -1);
  return n;
}

/** Try to read "<num> <container> ... each ... <num> <item>" out of a prompt. */
function detectEqualGroups(id: string, prompt: string): EqualGroupsSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();

  // groups: first "<number> <word>" — the containers ("4 baskets")
  const groupsMatch = text.match(/(\d+)\s+([A-Za-z]+)/);
  // perGroup: a number that appears after "each" / "every" / "per" ("each ... 6 apples")
  const perGroupMatch =
    text.match(/(?:each|every|per)\b[^.]*?(\d+)\s+([A-Za-z]+)/i) ||
    text.match(/(\d+)\s+([A-Za-z]+)\s+(?:in each|per)\b/i);

  if (!groupsMatch || !perGroupMatch) return null;

  const groups = parseInt(groupsMatch[1], 10);
  const perGroup = parseInt(perGroupMatch[1], 10);
  if (!Number.isFinite(groups) || !Number.isFinite(perGroup)) return null;
  // Keep it sane for a tablet: small, buildable quantities only.
  if (groups < 2 || groups > 8 || perGroup < 1 || perGroup > 12) return null;
  if (groups === perGroup && groupsMatch.index === perGroupMatch.index) return null;

  const containerNoun = singular(groupsMatch[2]);
  const itemNoun = singular(perGroupMatch[2]);

  return {
    id,
    kind: 'equal_groups',
    subject: 'Mathematics',
    conceptKey: 'multiplication-equal-groups',
    channel: 'manipulative',
    prompt,
    groups,
    perGroup,
    total: groups * perGroup,
    itemEmoji: ITEM_EMOJI[perGroupMatch[2].toLowerCase()] ?? ITEM_EMOJI[itemNoun] ?? '🔵',
    containerEmoji: CONTAINER_EMOJI[groupsMatch[2].toLowerCase()] ?? CONTAINER_EMOJI[containerNoun] ?? '📦',
    containerLabel: containerNoun,
  };
}

/** Try to read a fraction-shading task ("shade 3/4", "color 2 of 5 parts"). */
function detectFraction(id: string, prompt: string): PartitionSplitSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();
  const hasFractionWord = /\b(shade|shaded|fraction|colou?r|parts?|equal)\b/i.test(text);

  let numerator: number | null = null;
  let denominator: number | null = null;

  const slash = text.match(/(\d+)\s*\/\s*(\d+)/);
  const ofMatch = text.match(/(\d+)\s+(?:out of|of)\s+(?:the\s+)?(\d+)/i);
  if (slash) {
    numerator = parseInt(slash[1], 10);
    denominator = parseInt(slash[2], 10);
  } else if (ofMatch) {
    numerator = parseInt(ofMatch[1], 10);
    denominator = parseInt(ofMatch[2], 10);
  }

  if (numerator == null || denominator == null) return null;
  // Require a fraction cue unless it's an explicit a/b — avoids matching dates etc.
  if (!slash && !hasFractionWord) return null;
  if (denominator < 2 || denominator > 12) return null;
  if (numerator < 1 || numerator > denominator) return null;

  const shape: 'bar' | 'circle' = /\b(circle|pie|pizza|cake|round)\b/i.test(text) ? 'circle' : 'bar';
  return {
    id,
    kind: 'partition_split',
    subject: 'Mathematics',
    conceptKey: 'fractions',
    channel: 'visual',
    prompt,
    numerator,
    denominator,
    shape,
  };
}

/** Try to read a number-line placement ("place 47 on the number line 0 to 100"). */
function detectNumberLine(id: string, prompt: string): PlaceOnScaleSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();
  if (!/number\s*line/i.test(text)) return null;

  const range = text.match(/from\s+(\d+)\s+to\s+(\d+)/i) || text.match(/\b(\d+)\s+to\s+(\d+)\b/);
  const placeMatch =
    text.match(/(?:place|put|show|mark|where (?:does|is)|locate)\D*(\d+)/i) || text.match(/\b(\d+)\b/);
  if (!placeMatch) return null;

  const target = parseInt(placeMatch[1], 10);
  if (!Number.isFinite(target)) return null;

  let min: number;
  let max: number;
  if (range) {
    min = parseInt(range[1], 10);
    max = parseInt(range[2], 10);
  } else {
    min = 0;
    max = Math.max(10, Math.ceil((target + 1) / 10) * 10);
  }
  if (!(min < max) || target < min || target > max) return null;

  const step = max - min <= 20 ? 1 : 5;
  return {
    id,
    kind: 'place_on_scale',
    subject: 'Mathematics',
    conceptKey: 'number-line',
    channel: 'visual',
    prompt,
    min,
    max,
    step,
    tolerance: step,
    items: [{ id: 't', label: String(target), value: target }],
  };
}

/** Try to read an even/odd sort over a list of numbers. */
function detectEvenOddSort(id: string, prompt: string): SortCategorizeSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();
  if (!/\beven\b/i.test(text) || !/\bodd\b/i.test(text)) return null;

  const nums = (text.match(/\d+/g) ?? []).map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
  // De-dupe, keep a tablet-friendly amount.
  const unique = Array.from(new Set(nums)).slice(0, 8);
  if (unique.length < 2) return null;

  return {
    id,
    kind: 'sort_categorize',
    subject: 'Mathematics',
    conceptKey: 'parity',
    channel: 'manipulative',
    prompt,
    bins: [
      { id: 'even', label: 'Even', emoji: '🟦' },
      { id: 'odd', label: 'Odd', emoji: '🟥' },
    ],
    tokens: unique.map((n) => ({
      id: `n${n}`,
      label: String(n),
      correctBinId: n % 2 === 0 ? 'even' : 'odd',
    })),
  };
}

/** Try to read an ordering task ("order from least to greatest: 5, 2, 8"). */
function detectOrdering(id: string, prompt: string): OrderSequenceSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();
  if (
    !/\border\b|least to greatest|greatest to least|smallest to largest|largest to smallest|ascending|descending|increasing|decreasing|arrange/i.test(
      text,
    )
  ) {
    return null;
  }
  const nums = Array.from(new Set((text.match(/\d+/g) ?? []).map((n) => parseInt(n, 10)).filter(Number.isFinite)));
  if (nums.length < 3 || nums.length > 7) return null;

  const desc = /greatest to least|largest to smallest|decreasing|descending/i.test(text);
  const sorted = [...nums].sort((a, b) => a - b);
  if (desc) sorted.reverse();
  const rank = new Map(sorted.map((v, i) => [v, i]));

  return {
    id,
    kind: 'order_sequence',
    subject: 'Mathematics',
    conceptKey: 'order-numbers',
    channel: 'manipulative',
    prompt,
    items: nums.map((v) => ({ id: `n${v}`, label: String(v), correctIndex: rank.get(v) as number })),
    startLabel: desc ? 'Largest' : 'Smallest',
    endLabel: desc ? 'Smallest' : 'Largest',
  };
}

/** Try to read a repeating pattern and compute what comes next. */
function detectPattern(id: string, prompt: string): CompletePatternSpec | null {
  const text = prompt.replace(/\s+/g, ' ').trim();
  // Require a clear pattern cue to avoid grabbing any comma list.
  if (!/\bpattern\b|comes?\s+next|next\s+(?:colou?r|shape|number|term|one)/i.test(text)) return null;

  // Longest comma-separated run of short tokens (words or numbers).
  const listMatch = text.match(/(?:[A-Za-z]+|\d+)(?:\s*,\s*(?:[A-Za-z]+|\d+))+/);
  if (!listMatch) return null;
  const items = listMatch[0]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (items.length < 4) return null;

  // Smallest repeating unit that tiles the whole list.
  let unitLen = 0;
  for (let u = 1; u <= Math.floor(items.length / 2); u++) {
    let ok = true;
    for (let i = 0; i < items.length; i++) {
      if (items[i].toLowerCase() !== items[i % u].toLowerCase()) {
        ok = false;
        break;
      }
    }
    if (ok) {
      unitLen = u;
      break;
    }
  }
  if (!unitLen) return null;

  const nextToken = items[items.length % unitLen];
  const nextId = nextToken.toLowerCase();

  // Unique options, preserving first-seen casing.
  const seen = new Map<string, string>();
  for (const it of items) if (!seen.has(it.toLowerCase())) seen.set(it.toLowerCase(), it);
  const options = Array.from(seen.entries()).map(([key, label]) => ({ id: key, label }));
  if (options.length < 2) return null;

  return {
    id,
    kind: 'complete_pattern',
    subject: 'Mathematics',
    conceptKey: 'patterns',
    channel: 'visual',
    prompt,
    sequence: [...items, null],
    options,
    solution: [nextId],
  };
}

/**
 * @param prompt   the canonical problem text (e.g. activeQuest.prompt)
 * @param subject  optional subject gate (only synthesize for math today)
 * @returns an InteractionSpec to play, or null to fall back to choice cards.
 */
export function synthesizeInteraction(
  prompt: string | undefined,
  opts?: { subject?: string; id?: string },
): InteractionSpec | null {
  if (!prompt || prompt.trim().length === 0) return null;
  const subject = (opts?.subject ?? '').toUpperCase();
  const id = opts?.id ?? 'synth';

  // All current primitives are math; gate accordingly. Order matters: most
  // specific shapes first so a prompt resolves to the best-fit manipulative.
  if (!subject || subject === 'MATHEMATICS') {
    return (
      detectPattern(id, prompt) ??
      detectEqualGroups(id, prompt) ??
      detectFraction(id, prompt) ??
      detectNumberLine(id, prompt) ??
      detectOrdering(id, prompt) ??
      detectEvenOddSort(id, prompt) ??
      null
    );
  }

  // No match → caller uses the choice-card fallback.
  return null;
}
