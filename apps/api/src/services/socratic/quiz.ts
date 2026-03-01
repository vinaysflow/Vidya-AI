import type { Subject } from '@prisma/client';
import type { SessionReport } from './summarizer';
import { LlmClient } from '../llm/client';

export type QuizQuestionType = 'multiple_choice' | 'short_answer';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  concept: string;
  difficulty: QuizDifficulty;
}

export interface SessionQuiz {
  questions: QuizQuestion[];
}

export async function generateSessionQuiz(params: {
  sessionId: string;
  subject: Subject;
  language: string;
  report: SessionReport;
  count?: number;
}, client: LlmClient): Promise<SessionQuiz> {
  const { sessionId, subject, language, report, count = 3 } = params;

  const systemPrompt = `You generate short, high-quality micro-quizzes from session summaries.

Return ONLY JSON with this schema:
{
  "questions": [
    {
      "id": "<string>",
      "type": "multiple_choice" | "short_answer",
      "prompt": "<question text>",
      "options": ["A", "B", "C", "D"],   // only for multiple_choice
      "answer": "<correct answer>",
      "explanation": "<1-2 sentence explanation>",
      "concept": "<concept name>",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Guidelines:
- Use the session's concepts, strengths, and gaps.
- Keep questions concise and unambiguous.
- For multiple_choice, include 4 options.
- Write in the student's language: ${language}.`;

  const userPrompt = `
SESSION ID: ${sessionId}
SUBJECT: ${subject}
CONCEPTS ENGAGED: ${report.conceptsEngaged.join(', ') || 'none'}
STRENGTHS: ${report.strengths.join(', ') || 'none'}
AREAS TO IMPROVE: ${report.areasForImprovement.join(', ') || 'none'}
NEXT STEPS: ${report.nextSteps.join(', ') || 'none'}

Generate ${count} questions.
`.trim();

  try {
    const text = await client.generateText({
      modelType: 'analysis',
      maxTokens: 900,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      usePromptCache: true,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in quiz response');
    const parsed = JSON.parse(jsonMatch[0]) as SessionQuiz;

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return { questions: [] };
    }

    return parsed;
  } catch (error) {
    console.error('[Quiz] Failed to generate quiz:', error);
    return { questions: [] };
  }
}
