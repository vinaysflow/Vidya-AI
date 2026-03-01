/**
 * Pre-Computed Essay Metrics
 * 
 * Pure function, zero dependencies, zero LLM calls.
 * Computes structural and stylistic metrics for college application essays.
 * 
 * These metrics are injected into the Claude prompt as pre-verified facts,
 * so the LLM does less counting/analysis work and produces shorter output.
 * 
 * Saves ~200-400 tokens per analysis call.
 */

import { ESSAY_CLICHES, PASSIVE_VOICE_PATTERNS, SENSORY_WORDS } from './cliches';

// ============================================
// TYPES
// ============================================

export interface EssayMetrics {
  /** Total word count */
  wordCount: number;
  /** Number of sentences */
  sentenceCount: number;
  /** Number of paragraphs (separated by blank lines) */
  paragraphCount: number;
  /** Average words per sentence */
  avgSentenceLength: number;
  /** Average characters per word */
  avgWordLength: number;
  /** Flesch-Kincaid grade level (e.g., 10.5 = 10th grade reading level) */
  readabilityGrade: number;
  /** Flesch Reading Ease score (0-100, higher = easier) */
  readabilityScore: number;
  /** Percentage of sentences with passive voice constructions */
  passiveVoicePercent: number;
  /** List of cliches found in the text */
  clichesFound: string[];
  /** Whether the text contains proper nouns (names, places) */
  hasSpecificNames: boolean;
  /** Count of sensory language words (sight, sound, touch, smell, taste) */
  sensoryLanguageCount: number;
  /** Number of questions in the essay */
  questionCount: number;
  /** Number of exclamation marks */
  exclamationCount: number;
  /** Word count of the longest sentence */
  longestSentenceWords: number;
  /** Word count of the shortest sentence */
  shortestSentenceWords: number;
  /** Vocabulary diversity: unique words / total words (0-1) */
  uniqueWordRatio: number;
  /** Relationship to word limit */
  wordLimitStatus?: 'under' | 'at' | 'over';
  /** Words remaining before hitting the limit (negative if over) */
  wordsRemaining?: number;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Compute essay metrics from raw text content.
 * 
 * @param content - The essay text to analyze
 * @param wordLimit - Optional word limit for the essay prompt
 * @returns EssayMetrics object with all computed metrics
 */
export function computeEssayMetrics(
  content: string,
  wordLimit?: number
): EssayMetrics {
  const trimmed = content.trim();

  if (!trimmed) {
    return emptyMetrics(wordLimit);
  }

  // Basic counts
  const words = getWords(trimmed);
  const wordCount = words.length;
  const sentences = getSentences(trimmed);
  const sentenceCount = Math.max(sentences.length, 1);
  const paragraphs = getParagraphs(trimmed);
  const paragraphCount = paragraphs.length;

  // Averages
  const avgSentenceLength = wordCount / sentenceCount;
  const totalCharLength = words.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = totalCharLength / Math.max(wordCount, 1);

  // Sentence length extremes
  const sentenceLengths = sentences.map(s => getWords(s).length);
  const longestSentenceWords = Math.max(...sentenceLengths, 0);
  const shortestSentenceWords = sentenceLengths.length > 0
    ? Math.min(...sentenceLengths.filter(l => l > 0))
    : 0;

  // Readability
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const readabilityScore = fleschReadingEase(wordCount, sentenceCount, totalSyllables);
  const readabilityGrade = fleschKincaidGrade(wordCount, sentenceCount, totalSyllables);

  // Passive voice
  const passiveSentences = sentences.filter(s =>
    PASSIVE_VOICE_PATTERNS.some(p => p.test(s))
  ).length;
  const passiveVoicePercent = Math.round((passiveSentences / sentenceCount) * 100);

  // Cliche detection
  const lowerContent = trimmed.toLowerCase();
  const clichesFound = ESSAY_CLICHES.filter(c => lowerContent.includes(c));

  // Proper nouns (simple heuristic: capitalized words not at sentence start)
  const hasSpecificNames = detectProperNouns(trimmed);

  // Sensory language
  const lowerWords = words.map(w => w.toLowerCase());
  const sensoryLanguageCount = lowerWords.filter(w =>
    SENSORY_WORDS.includes(w)
  ).length;

  // Punctuation counts
  const questionCount = (trimmed.match(/\?/g) || []).length;
  const exclamationCount = (trimmed.match(/!/g) || []).length;

  // Vocabulary diversity
  const uniqueWords = new Set(lowerWords);
  const uniqueWordRatio = uniqueWords.size / Math.max(wordCount, 1);

  // Word limit
  let wordLimitStatus: 'under' | 'at' | 'over' | undefined;
  let wordsRemaining: number | undefined;
  if (wordLimit) {
    wordsRemaining = wordLimit - wordCount;
    if (wordCount > wordLimit) {
      wordLimitStatus = 'over';
    } else if (wordCount >= wordLimit * 0.9) {
      wordLimitStatus = 'at';
    } else {
      wordLimitStatus = 'under';
    }
  }

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    readabilityGrade: Math.round(readabilityGrade * 10) / 10,
    readabilityScore: Math.round(readabilityScore * 10) / 10,
    passiveVoicePercent,
    clichesFound,
    hasSpecificNames,
    sensoryLanguageCount,
    questionCount,
    exclamationCount,
    longestSentenceWords,
    shortestSentenceWords,
    uniqueWordRatio: Math.round(uniqueWordRatio * 100) / 100,
    wordLimitStatus,
    wordsRemaining,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function emptyMetrics(wordLimit?: number): EssayMetrics {
  return {
    wordCount: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    avgSentenceLength: 0,
    avgWordLength: 0,
    readabilityGrade: 0,
    readabilityScore: 0,
    passiveVoicePercent: 0,
    clichesFound: [],
    hasSpecificNames: false,
    sensoryLanguageCount: 0,
    questionCount: 0,
    exclamationCount: 0,
    longestSentenceWords: 0,
    shortestSentenceWords: 0,
    uniqueWordRatio: 0,
    wordLimitStatus: wordLimit ? 'under' : undefined,
    wordsRemaining: wordLimit,
  };
}

/** Split text into words (non-empty tokens split on whitespace) */
function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/** Split text into sentences using sentence-ending punctuation */
function getSentences(text: string): string[] {
  // Split on sentence terminators followed by space/newline or end of string
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/** Split text into paragraphs (separated by blank lines) */
function getParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Count syllables in a word using a simple heuristic.
 * Not perfect but accurate enough for Flesch-Kincaid.
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;

  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Silent e at end
  if (w.endsWith('e') && !w.endsWith('le')) {
    count = Math.max(1, count - 1);
  }

  // Common suffixes that don't add syllables
  if (w.endsWith('ed') && !w.endsWith('ted') && !w.endsWith('ded')) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}

/**
 * Flesch Reading Ease score.
 * 90-100: Very easy (5th grade)
 * 60-70: Standard (8th-9th grade) 
 * 0-30: Very difficult (college+)
 */
function fleschReadingEase(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;
  return (
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (syllableCount / wordCount)
  );
}

/**
 * Flesch-Kincaid Grade Level.
 * Returns the US school grade level needed to understand the text.
 */
function fleschKincaidGrade(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;
  return (
    0.39 * (wordCount / sentenceCount) +
    11.8 * (syllableCount / wordCount) -
    15.59
  );
}

/**
 * Detect whether the text contains proper nouns (names, places).
 * Heuristic: look for capitalized words that are NOT at the start of a sentence.
 */
function detectProperNouns(text: string): boolean {
  const sentences = getSentences(text);

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    // Skip first word of each sentence (always capitalized)
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z]/g, '');
      if (word.length > 1 && /^[A-Z]/.test(word)) {
        // Exclude common sentence-internal capitalizations
        const commonWords = new Set(['I', 'I\'m', 'I\'d', 'I\'ll', 'I\'ve']);
        if (!commonWords.has(word)) {
          return true;
        }
      }
    }
  }

  return false;
}
