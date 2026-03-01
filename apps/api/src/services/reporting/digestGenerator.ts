import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StudentSummary {
  studentId: string;
  studentName: string | null;
  totalSessions: number;
  totalMinutes: number;
  subjectBreakdown: Array<{ subject: string; sessions: number; avgMastery: number }>;
  strengths: string[];
  focusAreas: string[];
  xpEarned: number;
  currentStreak: number;
  badgesEarned: number;
}

export async function generateStudentSummary(
  studentId: string,
  days = 7,
): Promise<StudentSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  });

  const sessions = await prisma.session.findMany({
    where: { userId: studentId, startedAt: { gte: since }, status: 'COMPLETED' },
    select: { subject: true, report: true, startedAt: true, endedAt: true },
  });

  const subjectMap = new Map<string, { sessions: number; masterySum: number }>();
  const allStrengths: string[] = [];
  const allFocusAreas: string[] = [];
  let totalMinutes = 0;

  for (const s of sessions) {
    const entry = subjectMap.get(s.subject) || { sessions: 0, masterySum: 0 };
    entry.sessions++;
    const report = s.report as any;
    if (report?.durationMinutes) totalMinutes += report.durationMinutes;
    if (report?.strengths) allStrengths.push(...report.strengths);
    if (report?.areasForImprovement) allFocusAreas.push(...report.areasForImprovement);
    subjectMap.set(s.subject, entry);
  }

  const progress = await prisma.progress.findMany({
    where: { userId: studentId },
    select: { subject: true, mastery: true },
  });

  for (const p of progress) {
    const entry = subjectMap.get(p.subject);
    if (entry) {
      entry.masterySum += p.mastery;
    }
  }

  const gam = await prisma.userGamification.findUnique({ where: { userId: studentId } });
  const xpEvents = await prisma.xPEvent.aggregate({
    where: { userId: studentId, createdAt: { gte: since } },
    _sum: { xpAmount: true },
  });
  const badges = await prisma.userBadge.count({
    where: { userId: studentId, earnedAt: { gte: since } },
  });

  const strengthCounts = countFrequency(allStrengths);
  const focusCounts = countFrequency(allFocusAreas);

  return {
    studentId,
    studentName: student?.name ?? null,
    totalSessions: sessions.length,
    totalMinutes,
    subjectBreakdown: Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      sessions: data.sessions,
      avgMastery: data.sessions > 0 ? Math.round(data.masterySum / data.sessions) : 0,
    })),
    strengths: strengthCounts.slice(0, 3),
    focusAreas: focusCounts.slice(0, 3),
    xpEarned: xpEvents._sum.xpAmount ?? 0,
    currentStreak: gam?.currentStreak ?? 0,
    badgesEarned: badges,
  };
}

export async function generateClassSummary(
  classRoomId: string,
  days = 7,
): Promise<{
  className: string;
  studentCount: number;
  students: StudentSummary[];
  classStrengths: string[];
  classGaps: string[];
}> {
  const classRoom = await prisma.classRoom.findUnique({
    where: { id: classRoomId },
    include: { students: { select: { userId: true } } },
  });

  if (!classRoom) throw new Error('Classroom not found');

  const summaries = await Promise.all(
    classRoom.students.map((s) => generateStudentSummary(s.userId, days)),
  );

  const allStrengths = summaries.flatMap((s) => s.strengths);
  const allGaps = summaries.flatMap((s) => s.focusAreas);

  return {
    className: classRoom.name,
    studentCount: summaries.length,
    students: summaries,
    classStrengths: countFrequency(allStrengths).slice(0, 3),
    classGaps: countFrequency(allGaps).slice(0, 3),
  };
}

function countFrequency(items: string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
}
