/**
 * Pre-Computed Literature Analysis Metrics
 *
 * Pure function, zero dependencies, zero LLM calls.
 * Scans student messages for literary engagement signals: quoted text,
 * textual references, question usage, and response structure.
 */

// ============================================
// TYPES
// ============================================

export interface LitMetrics {
  /** Word count */
  wordCount: number;
  /** Sentence count */
  sentenceCount: number;
  /** Number of quoted phrases (text in quotation marks) */
  quotedPhraseCount: number;
  /** Number of questions the student asks */
  questionCount: number;
  /** Whether the student references "the author", "the text", "the narrator", etc. */
  hasTextualReference: boolean;
  /** Whether the student uses first-person interpretive language */
  hasPersonalInterpretation: boolean;
  /** Count of literary device terms used */
  literaryDeviceCount: number;
  /** Names of literary devices mentioned */
  literaryDevicesFound: string[];
  /** Whether message contains evidence-based reasoning (quote + interpretation) */
  hasEvidenceBasedClaim: boolean;
}

// ============================================
// DETECTION PATTERNS
// ============================================

const TEXTUAL_REFS = /\b(?:the\s+(?:author|narrator|speaker|poet|writer|text|passage|poem|story|novel|play|essay)|this\s+(?:passage|text|poem|story|line|scene|chapter))\b/i;

const PERSONAL_INTERPRETATION = /\b(?:i\s+think|i\s+believe|i\s+noticed|i\s+feel|in\s+my\s+(?:opinion|reading|interpretation|view)|it\s+(?:seems|appears)\s+(?:to\s+me|that)|my\s+(?:reading|interpretation|analysis))\b/i;

const LITERARY_DEVICES: Record<string, RegExp> = {
  metaphor: /\bmetaphor(?:s|ical)?\b/i,
  simile: /\bsimile(?:s)?\b/i,
  irony: /\biron(?:y|ic|ical)\b/i,
  symbolism: /\bsymbol(?:s|ism|ic|ize[sd]?)?\b/i,
  foreshadowing: /\bforeshadow(?:s|ed|ing)?\b/i,
  imagery: /\bimagery\b/i,
  alliteration: /\balliteration\b/i,
  personification: /\bpersonif(?:ication|y|ied|ies)\b/i,
  hyperbole: /\bhyperbole?\b/i,
  onomatopoeia: /\bonomatopoeia\b/i,
  oxymoron: /\boxymoron\b/i,
  juxtaposition: /\bjuxtaposition\b/i,
  allegory: /\ballegor(?:y|ical)\b/i,
  motif: /\bmotif(?:s)?\b/i,
  tone: /\btone\b/i,
  mood: /\bmood\b/i,
  diction: /\bdiction\b/i,
  syntax: /\bsyntax\b/i,
  enjambment: /\benjambment\b/i,
  caesura: /\bcaesura\b/i,
};

// ============================================
// MAIN FUNCTION
// ============================================

export function computeLitMetrics(message: string): LitMetrics {
  const trimmed = message.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  const quotedPhrases = trimmed.match(/[""\u201C\u201D]([^""\u201C\u201D]+)[""\u201C\u201D]/g) || [];
  const quotedPhraseCount = quotedPhrases.length;

  const questionCount = (trimmed.match(/\?/g) || []).length;

  const hasTextualReference = TEXTUAL_REFS.test(trimmed);
  const hasPersonalInterpretation = PERSONAL_INTERPRETATION.test(trimmed);

  const literaryDevicesFound: string[] = [];
  for (const [device, pattern] of Object.entries(LITERARY_DEVICES)) {
    if (pattern.test(trimmed)) literaryDevicesFound.push(device);
  }

  const hasEvidenceBasedClaim = quotedPhraseCount > 0 && hasPersonalInterpretation;

  return {
    wordCount,
    sentenceCount,
    quotedPhraseCount,
    questionCount,
    hasTextualReference,
    hasPersonalInterpretation,
    literaryDeviceCount: literaryDevicesFound.length,
    literaryDevicesFound,
    hasEvidenceBasedClaim,
  };
}
