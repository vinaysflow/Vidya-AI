import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MisconceptionEntry {
  distractorIndex: 0 | 1;
  pattern: string;
  diagnosis: string;
  socraticResponse: string;
  prerequisiteGap: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fetches example questions from the QuestionTemplate table for a given concept and grade.
 * Results are randomized on each call to ensure variety.
 * Pass excludeIds to avoid repeating templates already used in the session.
 * Used by the elementary overlay to inject few-shot examples, anchoring LLM output quality.
 */
export async function getExampleQuestions(
  conceptKey: string,
  gradeLevel: number,
  limit = 2,
  excludeIds: string[] = []
): Promise<{ texts: string[]; ids: string[] }> {
  try {
    const where: Record<string, unknown> = { conceptKey, gradeLevel };
    if (excludeIds.length > 0) where.id = { notIn: excludeIds };

    let templates = await prisma.questionTemplate.findMany({
      where,
      take: 10,
    });

    // Fallback: any templates at this grade level
    if (templates.length === 0) {
      const fallbackWhere: Record<string, unknown> = { gradeLevel };
      if (excludeIds.length > 0) fallbackWhere.id = { notIn: excludeIds };
      templates = await prisma.questionTemplate.findMany({
        where: fallbackWhere,
        take: 10,
      });
    }

    const picked = shuffle(templates).slice(0, limit);
    return {
      texts: picked.map(
        (t) =>
          `Q: ${t.questionText}\nCorrect answer: ${t.answerFormula}\nSolution: ${(t.solutionSteps as string[]).join(' -> ')}`
      ),
      ids: picked.map((t) => t.id),
    };
  } catch {
    return { texts: [], ids: [] };
  }
}

/**
 * Fetches misconception data for a specific QuestionTemplate by templateId.
 * Returns the two misconception entries (one per distractor) if available.
 * Used by the engine to surface targeted Socratic responses when a student
 * picks a specific wrong answer.
 */
export async function getMisconceptionContext(
  templateId: string,
): Promise<MisconceptionEntry[] | null> {
  try {
    const template = await prisma.questionTemplate.findUnique({
      where: { id: templateId },
      select: { misconceptions: true },
    });
    if (!template?.misconceptions) return null;
    const entries = template.misconceptions as unknown as MisconceptionEntry[];
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries;
  } catch {
    return null;
  }
}

/**
 * Builds a system prompt addendum for the engine when a student picks a known
 * wrong answer (distractor). Surfaces the specific misconception pattern
 * and a pre-authored Socratic response.
 *
 * @param misconceptions - Array of MisconceptionEntry from the template
 * @param pickedDistractorIndex - Which distractor the student chose (0 or 1)
 */
export function buildMisconceptionAddendum(
  misconceptions: MisconceptionEntry[],
  pickedDistractorIndex: 0 | 1,
): string | null {
  const entry = misconceptions.find((m) => m.distractorIndex === pickedDistractorIndex);
  if (!entry) return null;

  return `
### MISCONCEPTION DETECTED: ${entry.pattern}
The student's wrong answer reveals a specific misconception:
- **What went wrong**: ${entry.diagnosis}
- **Prerequisite gap**: ${entry.prerequisiteGap}
- **Suggested Socratic question**: "${entry.socraticResponse}"

Use this exact Socratic question (or a slight paraphrase) to guide the student. Do NOT reveal the correct answer. Address the specific gap identified above.`.trim();
}
