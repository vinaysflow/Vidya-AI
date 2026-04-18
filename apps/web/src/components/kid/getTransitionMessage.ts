/**
 * getTransitionMessage
 *
 * Pure function that maps a game questionType to a transition preview message.
 * Returns null for question types that do not require a preview card.
 *
 * Academic basis:
 *  - Predictability reduces anxiety in neurodiverse learners
 *  - Advance notice of task-switching reduces cognitive load
 */

export interface QuestRef {
  conceptKey?: string;
  title?: string;
}

type QuestionType = string | null | undefined;

export function getTransitionMessage(questionType: QuestionType, quest: QuestRef | null): string | null {
  if (!questionType) return null;

  switch (questionType) {
    case 'celebrate_then_explain_back':
      return '✏️ Your turn — explain how you got there';

    case 'celebration':
      return '✨ Nice thinking — onto the next one';

    case 'hint_with_question':
    case 'foundational': {
      const topic = quest?.title ?? quest?.conceptKey ?? 'this topic';
      return `💡 Next: a question about ${topic}!`;
    }

    default:
      return null;
  }
}
