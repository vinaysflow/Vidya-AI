import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
