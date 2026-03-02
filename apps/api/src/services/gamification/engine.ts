import { PrismaClient, XPEventType, BadgeType } from '@prisma/client';
import { XP_TABLE, LEVEL_XP, STREAK_FREEZE_MILESTONES } from './xpTable';

const prisma = new PrismaClient();

async function ensureUser(userId: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── XP ──────────────────────────────────────────────

export async function awardXP(
  userId: string,
  eventType: XPEventType,
  sessionId?: string,
): Promise<{ xpAwarded: number; newLevel: number; leveledUp: boolean; streakFreezeEarned: boolean }> {
  const amount = XP_TABLE[eventType];

  await prisma.xPEvent.create({
    data: { userId, eventType, xpAmount: amount, sessionId },
  });

  const gam = await prisma.userGamification.upsert({
    where: { userId },
    create: { userId, xp: amount, level: 1 },
    update: { xp: { increment: amount } },
  });

  const newLevel = Math.floor(gam.xp / LEVEL_XP) + 1;
  const leveledUp = newLevel > gam.level;
  let streakFreezeEarned = false;

  if (leveledUp) {
    const updates: Record<string, unknown> = { level: newLevel };
    if (STREAK_FREEZE_MILESTONES.includes(newLevel)) {
      updates.streakFreezes = { increment: 1 };
      streakFreezeEarned = true;
    }
    await prisma.userGamification.update({ where: { userId }, data: updates as any });
  }

  return { xpAwarded: amount, newLevel: leveledUp ? newLevel : gam.level, leveledUp, streakFreezeEarned };
}

// ── Streaks ─────────────────────────────────────────

export async function updateStreak(userId: string): Promise<{ streak: number; frozen: boolean }> {
  const gam = await prisma.userGamification.upsert({
    where: { userId },
    create: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: todayStr() },
    update: {},
  });

  const today = todayStr();
  if (gam.lastActiveDate === today) {
    return { streak: gam.currentStreak, frozen: false };
  }

  const yesterday = yesterdayStr();
  let newStreak: number;
  let frozen = false;

  if (gam.lastActiveDate === yesterday) {
    newStreak = gam.currentStreak + 1;
  } else if (gam.streakFreezes > 0) {
    newStreak = gam.currentStreak + 1;
    frozen = true;
    await prisma.userGamification.update({
      where: { userId },
      data: { streakFreezes: { decrement: 1 } },
    });
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(gam.longestStreak, newStreak);

  await prisma.userGamification.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak, lastActiveDate: today },
  });

  return { streak: newStreak, frozen };
}

// ── Badges ──────────────────────────────────────────

interface BadgeCheck {
  badge: BadgeType;
  check: (userId: string) => Promise<boolean>;
}

const BADGE_CHECKS: BadgeCheck[] = [
  {
    badge: 'FIRST_STEP',
    check: async (uid) => {
      const count = await prisma.session.count({ where: { userId: uid, status: 'COMPLETED' } });
      return count >= 1;
    },
  },
  {
    badge: 'STREAK_5',
    check: async (uid) => {
      const g = await prisma.userGamification.findUnique({ where: { userId: uid } });
      return (g?.longestStreak ?? 0) >= 5;
    },
  },
  {
    badge: 'STREAK_30',
    check: async (uid) => {
      const g = await prisma.userGamification.findUnique({ where: { userId: uid } });
      return (g?.longestStreak ?? 0) >= 30;
    },
  },
  {
    badge: 'DEBUGGER',
    check: async (uid) => {
      const count = await prisma.session.count({
        where: { userId: uid, subject: 'CODING', status: 'COMPLETED' },
      });
      return count >= 5;
    },
  },
  {
    badge: 'POLYGLOT',
    check: async (uid) => {
      const langs = await prisma.session.findMany({
        where: { userId: uid },
        select: { language: true },
        distinct: ['language'],
      });
      return langs.length >= 3;
    },
  },
  {
    badge: 'SCHOLAR',
    check: async (uid) => {
      const g = await prisma.userGamification.findUnique({ where: { userId: uid } });
      return (g?.level ?? 0) >= 10;
    },
  },
  {
    badge: 'DEEP_DIVER',
    check: async (uid) => {
      const session = await prisma.session.findFirst({
        where: { userId: uid, messageCount: { gte: 20 }, resolved: true },
      });
      return !!session;
    },
  },
  {
    badge: 'SUBJECT_EXPLORER',
    check: async (uid) => {
      const subjects = await prisma.session.findMany({
        where: { userId: uid },
        select: { subject: true },
        distinct: ['subject'],
      });
      return subjects.length >= 5;
    },
  },
];

export async function checkBadges(userId: string): Promise<BadgeType[]> {
  const existing = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: true },
  });
  const earnedSet = new Set(existing.map((b) => b.badge));
  const newBadges: BadgeType[] = [];

  for (const { badge, check } of BADGE_CHECKS) {
    if (earnedSet.has(badge)) continue;
    const earned = await check(userId);
    if (earned) {
      await prisma.userBadge.create({ data: { userId, badge } });
      newBadges.push(badge);
    }
  }

  return newBadges;
}

// ── Profile ─────────────────────────────────────────

export interface GamificationProfile {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  nextLevelXp: number;
  badges: { badge: BadgeType; earnedAt: Date }[];
}

export async function getProfile(userId: string): Promise<GamificationProfile> {
  await ensureUser(userId);
  const gam = await prisma.userGamification.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const badges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
  });

  return {
    xp: gam.xp,
    level: gam.level,
    currentStreak: gam.currentStreak,
    longestStreak: gam.longestStreak,
    streakFreezes: gam.streakFreezes,
    nextLevelXp: gam.level * LEVEL_XP,
    badges: badges.map((b) => ({ badge: b.badge, earnedAt: b.earnedAt })),
  };
}

// ── Leaderboard ─────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  weeklyXp: number;
  level: number;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const results = await prisma.xPEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: weekAgo } },
    _sum: { xpAmount: true },
    orderBy: { _sum: { xpAmount: 'desc' } },
    take: limit,
  });

  const userIds = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const gams = await prisma.userGamification.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, level: true },
  });

  const nameMap = new Map(users.map((u) => [u.id, u.name]));
  const levelMap = new Map(gams.map((g) => [g.userId, g.level]));

  return results.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: nameMap.get(r.userId) || `Learner ${r.userId.slice(-4)}`,
    weeklyXp: r._sum.xpAmount ?? 0,
    level: levelMap.get(r.userId) ?? 1,
  }));
}
