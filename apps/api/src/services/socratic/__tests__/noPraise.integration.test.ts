/**
 * Integration test: no praise instructions leak into composed system prompt
 * addenda across any subject module, any kid-mode question type.
 *
 * This test enumerates:
 *   - All subject modules (stem covers PHYSICS/CHEMISTRY/MATHEMATICS/BIOLOGY,
 *     plus CODING, ECONOMICS, ENGLISH_LITERATURE, AI_LEARNING, COUNSELING,
 *     ESSAY_WRITING)
 *   - All 7 kid-relevant question types
 *
 * For each (module × questionType) pair it calls buildResponseSystemAddendum
 * with grade:4 metadata and asserts no forbidden praise phrase appears.
 *
 * This test MUST fail red before module edits (praise phrases are present).
 * If it passes on first run, the FORBIDDEN_PHRASES list or the call signature
 * is wrong — stop and fix.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getModule, registerModule } from '../registry';
import type { Subject } from '@prisma/client';

// Import all modules so they are available for manual registration below.
// We register them here rather than importing engine.ts to avoid LLM client
// initialisation side-effects.
import { stemModule } from '../modules/stem';
import { codingModule } from '../modules/coding';
import { economicsModule } from '../modules/economics';
import { englishLitModule } from '../modules/english-lit';
import { aiLearningModule } from '../modules/ai-learning';
import { counselorModule } from '../modules/counselor';
import { essayModule } from '../modules/essay';

beforeAll(() => {
  registerModule(stemModule);
  registerModule(codingModule);
  registerModule(economicsModule);
  registerModule(englishLitModule);
  registerModule(aiLearningModule);
  registerModule(counselorModule);
  registerModule(essayModule);
});

const KID_MODE_QUESTION_TYPES = [
  'clarifying',
  'socratic',
  'hint_with_question',
  'foundational',
  'celebration',
  'celebrate_then_explain_back',
  'encouragement',
] as const;

// One representative subject per module (stem covers 4 subjects — test all 4)
const SUBJECTS_TO_TEST: Subject[] = [
  'PHYSICS',
  'CHEMISTRY',
  'MATHEMATICS',
  'BIOLOGY',
  'CODING',
  'ECONOMICS',
  'ENGLISH_LITERATURE',
  'AI_LEARNING',
  'COUNSELING',
  'ESSAY_WRITING',
];

const FORBIDDEN_PHRASES = [
  'great work',
  'great job',
  'great analysis',
  'great progress',
  'great grasp',
  'great reading',
  'great strong reading',
  "you've got a great",
  'nice work',
  'nice answer',
  'nice job',
  'awesome',
  'nailed it',
  'nailed that',
  'boom',
  'perfect',
  'excellent',
  'amazing',
  'fantastic',
  'beautiful',
  'way to go',
  'you got it',
  "you're a star",
  'brilliant',
  // LLM instruction-level praise
  'celebrate immediately',
  'celebrate their',
  'celebrate first',
  'celebrate their success',
  'celebrate their solution',
  'celebrate their understanding',
  'celebrate their economic',
  'celebrate their strong',
  'celebrate what works',
  "celebrate what",
  // Specific observed hardcoded leaks
  'excellent economic thinking',
  'excellent travail',
  'ausgezeichnete',
  'großartige',
  'coming together nicely',
];

function containsPraise(text: string): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = phrase.includes(' ')
      ? new RegExp(escaped)
      : new RegExp(`\\b${escaped}\\b`);
    if (regex.test(lower)) hits.push(phrase);
  }
  return hits;
}

describe('No praise in kid-mode module system prompt addenda', () => {
  for (const subject of SUBJECTS_TO_TEST) {
    for (const questionType of KID_MODE_QUESTION_TYPES) {
      it(`${subject} / ${questionType}: no praise instructions`, () => {
        const mod = getModule(subject);

        const analysis = {
          conceptGaps: ['test concept'],
          suggestedFocus: 'test focus',
          distanceFromSolution: 50,
          studentStrengths: ['trying'],
          conceptsIdentified: ['attempting'],
        };

        const metadata = {
          grade: 4,
          effectiveGrade: 4,
          subject,
          questionType,
        };

        const addendum = mod.buildResponseSystemAddendum?.(analysis, metadata);

        if (!addendum) return;

        const hits = containsPraise(addendum);
        expect(
          hits,
          `Found praise in ${subject}/${questionType}: [${hits.join(', ')}]\n\nAddendum (first 2000 chars):\n${addendum.substring(0, 2000)}`,
        ).toEqual([]);
      });
    }
  }
});

// ============================================
// Surface 2: buildResponseUserPrompt typeInstructions
// ============================================

describe('No praise in buildResponseUserPrompt typeInstructions', () => {
  const LATIN_LANGUAGES = ['EN', 'FR', 'DE', 'ES'] as const;

  for (const subject of SUBJECTS_TO_TEST) {
    for (const questionType of KID_MODE_QUESTION_TYPES) {
      for (const language of LATIN_LANGUAGES) {
        it(`${subject} / ${questionType} / ${language}: no praise in user prompt`, () => {
          const mod = getModule(subject);
          if (!mod.buildResponseUserPrompt) return;

          const analysis = {
            conceptGaps: ['test concept'],
            suggestedFocus: 'test focus',
            distanceFromSolution: 50,
            studentStrengths: ['trying'],
            conceptsIdentified: ['attempting'],
            errorType: 'none',
            errorDescription: '',
          };

          const prompt = mod.buildResponseUserPrompt({
            questionType: questionType as any,
            analysis,
            language: language as any,
            historyText: 'Student: test message',
            metadata: { grade: 4, effectiveGrade: 4, subject },
          });

          const hits = containsPraise(prompt);
          expect(
            hits,
            `Found praise in buildResponseUserPrompt ${subject}/${questionType}/${language}: [${hits.join(', ')}]\n\nPrompt (first 1000 chars):\n${prompt.substring(0, 1000)}`,
          ).toEqual([]);
        });
      }
    }
  }
});

// ============================================
// Surface 3: getFallbackResponse hardcoded localized strings (EN/FR/DE/ES only)
// ============================================

describe('No praise in getFallbackResponse hardcoded strings', () => {
  const LATIN_LANGUAGES = ['EN', 'FR', 'DE', 'ES'];

  for (const subject of SUBJECTS_TO_TEST) {
    for (const questionType of KID_MODE_QUESTION_TYPES) {
      for (const language of LATIN_LANGUAGES) {
        it(`${subject} / ${questionType} / ${language}: no praise in fallback response`, () => {
          const mod = getModule(subject);
          const fallback = mod.getFallbackResponse(questionType, language);

          if (!fallback) return;

          const hits = containsPraise(fallback);
          expect(
            hits,
            `Found praise in getFallbackResponse ${subject}/${questionType}/${language}: [${hits.join(', ')}]\n\nFallback text: ${fallback}`,
          ).toEqual([]);
        });
      }
    }
  }
});
