import type { XPEventType } from '@prisma/client';

export const XP_TABLE: Record<XPEventType, number> = {
  MESSAGE_SENT: 5,
  SHOWED_WORK: 10,
  SESSION_COMPLETE: 25,
  EXPLAIN_BACK: 20,
  DAILY_FIRST: 15,
  QUIZ_COMPLETE: 30,
  QUIZ_PERFECT: 50,
};

export const LEVEL_XP = 100;

export const STREAK_FREEZE_MILESTONES = [5, 10, 20, 50];
