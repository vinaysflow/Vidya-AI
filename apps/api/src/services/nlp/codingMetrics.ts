/**
 * Pre-Computed Coding Metrics
 *
 * Pure function, zero dependencies, zero LLM calls.
 * Detects programming language, structural features, and surface-level
 * code quality signals so the analysis prompt has deterministic context.
 */

// ============================================
// TYPES
// ============================================

export interface CodingMetrics {
  /** Detected language (best guess) */
  detectedLanguage: string;
  /** Approximate line count of code content */
  lineCount: number;
  /** Whether the message contains a function/method definition */
  hasFunctionDef: boolean;
  /** Whether the message contains loop constructs */
  hasLoop: boolean;
  /** Whether the message contains conditional constructs */
  hasConditional: boolean;
  /** Whether the message contains class definitions */
  hasClass: boolean;
  /** Whether the message contains comments */
  hasComments: boolean;
  /** Approximate count of distinct variables/identifiers */
  identifierCount: number;
  /** Whether message looks like pseudocode rather than real code */
  isPseudocode: boolean;
  /** Estimated indentation depth (max nesting level) */
  maxNestingDepth: number;
  /** Whether the message contains import/require statements */
  hasImports: boolean;
}

// ============================================
// LANGUAGE DETECTION PATTERNS
// ============================================

const LANG_SIGNATURES: Record<string, RegExp[]> = {
  Python: [
    /\bdef\s+\w+\s*\(/,
    /\bimport\s+\w+/,
    /\bfrom\s+\w+\s+import/,
    /:\s*\n\s+/,
    /\bprint\s*\(/,
    /\bself\./,
    /\belif\b/,
  ],
  JavaScript: [
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\b=>\s*[{(]/,
    /\bconsole\.log/,
    /\brequire\s*\(/,
    /\bfunction\s+\w+\s*\(/,
    /\basync\s+function/,
  ],
  TypeScript: [
    /:\s*(?:string|number|boolean|any)\b/,
    /\binterface\s+\w+/,
    /\btype\s+\w+\s*=/,
    /<\w+(?:,\s*\w+)*>/,
  ],
  Java: [
    /\bpublic\s+(?:static\s+)?(?:void|int|String|boolean)/,
    /\bSystem\.out\.println/,
    /\bnew\s+\w+\s*\(/,
    /\bclass\s+\w+\s*(?:extends|implements)/,
  ],
  'C/C++': [
    /\b#include\s*[<"]/,
    /\bint\s+main\s*\(/,
    /\bprintf\s*\(/,
    /\bstd::/,
    /\bcout\s*<</,
  ],
};

// ============================================
// MAIN FUNCTION
// ============================================

export function computeCodingMetrics(message: string): CodingMetrics {
  const lines = message.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  const detectedLanguage = detectLanguage(message);
  const hasFunctionDef = /\b(?:def|function|fn|func|sub|proc)\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:\([^)]*\)|)\s*=>/.test(message);
  const hasLoop = /\b(?:for|while|do|foreach|loop)\b/.test(message);
  const hasConditional = /\b(?:if|else|elif|switch|case|when)\b/.test(message);
  const hasClass = /\b(?:class|struct|interface|enum)\s+\w+/.test(message);
  const hasComments = /(?:\/\/|#\s|\/\*|\*\/|"""|''')/.test(message);
  const hasImports = /\b(?:import|require|from|include|using)\b/.test(message);

  const identifiers = new Set(
    (message.match(/\b[a-zA-Z_]\w{1,30}\b/g) || [])
      .filter(id => !RESERVED_WORDS.has(id.toLowerCase()))
  );

  const isPseudocode = detectPseudocode(message);
  const maxNestingDepth = estimateNesting(lines);

  return {
    detectedLanguage,
    lineCount: nonEmptyLines.length,
    hasFunctionDef,
    hasLoop,
    hasConditional,
    hasClass,
    hasComments,
    identifierCount: identifiers.size,
    isPseudocode,
    maxNestingDepth,
    hasImports,
  };
}

// ============================================
// HELPERS
// ============================================

function detectLanguage(text: string): string {
  let bestLang = 'generic';
  let bestScore = 0;

  for (const [lang, patterns] of Object.entries(LANG_SIGNATURES)) {
    const score = patterns.filter(p => p.test(text)).length;
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestScore >= 2 ? bestLang : 'generic';
}

function detectPseudocode(text: string): boolean {
  const pseudoIndicators = [
    /\bstep\s*\d/i,
    /\brepeat\s+until\b/i,
    /\b(?:set|initialize)\s+\w+\s+(?:to|as|=)\s/i,
    /\bfor each\b/i,
    /\b(?:input|output|print|display)\s/i,
  ];
  const codeIndicators = [/[;{}()[\]]/, /\bdef\s/, /\bfunction\s/, /\b=>\s/];

  const pseudoScore = pseudoIndicators.filter(p => p.test(text)).length;
  const codeScore = codeIndicators.filter(p => p.test(text)).length;

  return pseudoScore > codeScore && pseudoScore >= 2;
}

function estimateNesting(lines: string[]): number {
  let maxDepth = 0;

  for (const line of lines) {
    const leading = line.match(/^(\s*)/)?.[1] || '';
    const spaces = leading.replace(/\t/g, '    ').length;
    const depth = Math.floor(spaces / 2);
    if (depth > maxDepth) maxDepth = depth;
  }

  return Math.min(maxDepth, 10);
}

const RESERVED_WORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue',
  'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw',
  'new', 'delete', 'typeof', 'instanceof', 'void', 'this', 'super',
  'class', 'extends', 'implements', 'interface', 'enum', 'const', 'let',
  'var', 'function', 'import', 'export', 'from', 'as', 'async', 'await',
  'yield', 'true', 'false', 'null', 'undefined', 'def', 'print', 'self',
  'none', 'and', 'or', 'not', 'in', 'is', 'pass', 'with', 'lambda',
  'elif', 'except', 'raise', 'int', 'str', 'float', 'bool', 'list',
  'dict', 'set', 'tuple', 'range', 'len', 'type', 'the', 'a', 'an',
  'to', 'of', 'it', 'on', 'at', 'by', 'so', 'my', 'we', 'be',
]);
