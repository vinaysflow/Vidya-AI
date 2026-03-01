/**
 * Pre-Computed Economics Metrics
 *
 * Pure function, zero dependencies, zero LLM calls.
 * Scans student messages for economic model cues, quantitative content,
 * and reasoning structure so the analysis prompt gets deterministic context.
 */

// ============================================
// TYPES
// ============================================

export interface EconomicsMetrics {
  /** Word count of the message */
  wordCount: number;
  /** Whether the message contains numeric values or percentages */
  hasQuantitativeContent: boolean;
  /** Count of numeric values found */
  numericValueCount: number;
  /** Economic models/frameworks referenced */
  modelsReferenced: string[];
  /** Whether the message mentions a graph, curve, or diagram */
  hasGraphReference: boolean;
  /** Whether the message contains causal reasoning language */
  hasCausalReasoning: boolean;
  /** Detected economic domain (micro, macro, trade, etc.) */
  detectedDomain: string;
  /** Number of steps in reasoning chain (heuristic) */
  reasoningStepCount: number;
}

// ============================================
// MODEL/FRAMEWORK PATTERNS
// ============================================

const MODEL_PATTERNS: Record<string, RegExp> = {
  'supply-demand': /\b(?:supply|demand)\s+(?:curve|schedule|and\s+(?:supply|demand))/i,
  'AD-AS': /\b(?:aggregate\s+(?:demand|supply)|ad[/-]as)\b/i,
  'Phillips curve': /\bphillips\s+curve\b/i,
  'IS-LM': /\b(?:is[/-]lm)\b/i,
  'PPF': /\b(?:production\s+possibility|ppf|ppc)\b/i,
  'multiplier': /\b(?:multiplier\s+(?:effect|model)|fiscal\s+multiplier|money\s+multiplier)\b/i,
  'elasticity': /\b(?:price|income|cross)\s+elasticity\b/i,
  'game theory': /\b(?:nash\s+equilibrium|prisoner'?s?\s+dilemma|dominant\s+strategy|game\s+theory)\b/i,
  'comparative advantage': /\bcomparative\s+advantage\b/i,
  'market failure': /\b(?:market\s+failure|externality|public\s+good|free\s+rider)\b/i,
  'GDP accounting': /\b(?:gdp|gross\s+domestic\s+product|national\s+income)\b/i,
  'monetary policy': /\b(?:monetary\s+policy|interest\s+rate|money\s+supply|reserve\s+ratio)\b/i,
  'fiscal policy': /\b(?:fiscal\s+policy|government\s+spending|taxation|budget\s+deficit)\b/i,
};

const GRAPH_KEYWORDS = /\b(?:graph|curve|diagram|axis|axes|plot|shift(?:s|ed|ing)?|movement\s+along|equilibrium\s+point|intersection)\b/i;

const CAUSAL_KEYWORDS = /\b(?:leads?\s+to|causes?|results?\s+in|because|therefore|consequently|as\s+a\s+result|this\s+means|which\s+(?:leads|causes|results)|if\s+.*\s+then)\b/i;

const DOMAIN_SIGNALS: Record<string, RegExp> = {
  micro: /\b(?:firm|consumer|producer|market\s+(?:structure|power)|monopoly|oligopoly|perfect\s+competition|utility|indifference\s+curve|marginal\s+(?:cost|revenue|utility)|price\s+(?:ceiling|floor)|deadweight\s+loss)\b/i,
  macro: /\b(?:gdp|inflation|unemployment|aggregate|monetary|fiscal|central\s+bank|rbi|fed|recession|boom|business\s+cycle|national\s+income)\b/i,
  trade: /\b(?:tariff|quota|trade\s+(?:balance|deficit|surplus)|import|export|exchange\s+rate|comparative\s+advantage|absolute\s+advantage|wto|protectionism)\b/i,
  indian_economy: /\b(?:rbi|niti\s+aayog|five\s+year\s+plan|liberali[sz]ation|make\s+in\s+india|gst|msp|nrega|pds|fdi\s+in\s+india)\b/i,
};

// ============================================
// MAIN FUNCTION
// ============================================

export function computeEconomicsMetrics(message: string): EconomicsMetrics {
  const words = message.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const numericValues = message.match(/\d+(?:\.\d+)?(?:\s*%|\s*(?:billion|million|trillion|crore|lakh))?/gi) || [];

  const modelsReferenced: string[] = [];
  for (const [model, pattern] of Object.entries(MODEL_PATTERNS)) {
    if (pattern.test(message)) modelsReferenced.push(model);
  }

  const hasGraphReference = GRAPH_KEYWORDS.test(message);
  const hasCausalReasoning = CAUSAL_KEYWORDS.test(message);

  let detectedDomain = 'general';
  let bestScore = 0;
  for (const [domain, pattern] of Object.entries(DOMAIN_SIGNALS)) {
    const matches = message.match(new RegExp(pattern.source, 'gi')) || [];
    if (matches.length > bestScore) {
      bestScore = matches.length;
      detectedDomain = domain;
    }
  }

  const reasoningMarkers = message.match(/\b(?:first|second|third|next|then|therefore|because|so|thus|hence|step\s*\d)\b/gi) || [];
  const reasoningStepCount = Math.min(reasoningMarkers.length, 10);

  return {
    wordCount,
    hasQuantitativeContent: numericValues.length > 0,
    numericValueCount: numericValues.length,
    modelsReferenced,
    hasGraphReference,
    hasCausalReasoning,
    detectedDomain,
    reasoningStepCount,
  };
}
