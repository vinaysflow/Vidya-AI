/**
 * Visual Content Generator
 *
 * Decides whether a tutor response benefits from an infographic
 * and emits structured VisualContent that the frontend whiteboard
 * renderer can display.
 *
 * Runs as a lightweight post-processing step after response generation.
 * Uses the analysis model (cheap) to keep cost low.
 */

import type { Language, Subject, VisualContent, AnalysisResult } from './types';
import { LlmClient } from '../llm/client';
import { resolveModelPolicy, type ModelPolicyOverride } from './routingPolicy';

const VISUAL_ELIGIBLE_SUBJECTS: Subject[] = [
  'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY',
  'CODING', 'ECONOMICS', 'AI_LEARNING',
];

const SUBJECT_VISUAL_HINTS: Partial<Record<Subject, string>> = {
  PHYSICS: 'equation_steps for derivations, diagram for force/circuit/optics diagrams, scatter_plot for motion/energy graphs',
  CHEMISTRY: 'equation_steps for reaction balancing, diagram for molecular structure or apparatus',
  MATHEMATICS: 'equation_steps for proofs/derivations, scatter_plot for function graphs, diagram for geometry',
  BIOLOGY: 'diagram for anatomy/cell/process flows',
  CODING: 'code_trace for algorithm walkthroughs',
  ECONOMICS: 'scatter_plot for supply-demand/cost curves, diagram for circular flow or market models',
  AI_LEARNING: 'diagram for neural network architecture, scatter_plot for loss/accuracy curves, code_trace for algorithm steps',
};

const VISUAL_GENERATION_PROMPT = `You are a visual content generator for an educational tutoring app.
Given a tutor's response and analysis context, decide whether a visual would help the student understand the concept, and if so, generate structured JSON.

RULES:
- Only generate a visual if it genuinely adds clarity. Most short responses do NOT need one.
- Pick exactly one type that best fits.
- Keep data minimal and correct.
- If no visual helps, return: { "skip": true }

AVAILABLE TYPES:
1. equation_steps — for step-by-step derivations/solutions
   { "type": "equation_steps", "data": { "steps": ["step1 in LaTeX or text", "step2", ...] } }

2. code_trace — for code execution walkthroughs  
   { "type": "code_trace", "data": { "code": "source code", "steps": [{ "line": 1, "variables": {"x": 5}, "output": "optional" }] } }

3. diagram — for conceptual diagrams (forces, circuits, flows, structures)
   { "type": "diagram", "data": { "elements": [{ "type": "rect"|"circle"|"arrow"|"text", ...props }], "width": 400, "height": 300 } }
   Element props: rect needs center+width+height+label, circle needs center+radius+label, arrow needs from+to+label, text needs center+label

4. scatter_plot / graph — for data plots and function graphs
   { "type": "scatter_plot", "data": { "points": [{"x": 0, "y": 0, "label": "optional"}], "xLabel": "X", "yLabel": "Y" } }

Respond with a single JSON object only. No markdown, no explanation.`;

export async function generateVisualContent(params: {
  subject: Subject;
  tutorMessage: string;
  analysis: any;
  language: Language;
  client: LlmClient;
  modelPolicy?: ModelPolicyOverride;
}): Promise<VisualContent | null> {
  const { subject, tutorMessage, analysis, language, client, modelPolicy } = params;

  if (!VISUAL_ELIGIBLE_SUBJECTS.includes(subject)) return null;
  if (tutorMessage.length < 80) return null;

  const subjectHints = SUBJECT_VISUAL_HINTS[subject] || '';
  const conceptContext = analysis?.conceptsIdentified?.join(', ') || '';
  const topicContext = analysis?.topic || analysis?.suggestedFocus || '';

  const userPrompt = `SUBJECT: ${subject}
TOPIC: ${topicContext}
CONCEPTS: ${conceptContext}
SUBJECT VISUAL HINTS: ${subjectHints}

TUTOR MESSAGE:
${tutorMessage.slice(0, 1500)}

Generate a visual if it would help. Otherwise return { "skip": true }.`;

  try {
    const policy = resolveModelPolicy(modelPolicy);
    const content = await client.generateText({
      modelType: 'analysis',
      maxTokens: 600,
      systemPrompt: VISUAL_GENERATION_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      usePromptCache: true,
      providerOverride: policy.provider,
      modelOverride: policy.model,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.skip) return null;

    const validTypes = ['equation_steps', 'code_trace', 'diagram', 'graph', 'scatter_plot'];
    if (!validTypes.includes(parsed.type)) return null;
    if (!parsed.data || typeof parsed.data !== 'object') return null;

    return { type: parsed.type, data: parsed.data };
  } catch (err) {
    console.warn('[VisualGenerator] Failed to generate visual:', err);
    return null;
  }
}
