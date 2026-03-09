/**
 * questRecommender.ts
 *
 * Scores and ranks quests to recommend for a given learner.
 * Replaces the static subject filter in WelcomeScreen kid mode.
 *
 * Scoring rubric (max 100 pts per quest):
 *   +30 — Mastery gap: concept mastery 15-39 (in-progress, needs reinforcement)
 *   +20 — Fresh concept: mastery 0 or null (new learning)
 *   +25 — Variety nudge: subject different from the last 3 sessions (if 3+ sessions same)
 *   +15 — Subject momentum: same subject as most recent session
 *   +10 — Interest alignment: quest chapter matches a user interest
 *
 * Returns top N quests, deduplicated by conceptKey (max 1 per concept).
 */

export interface Quest {
  id: string;
  title: string;
  prompt: string;
  subject: string;
  chapter?: string;
  conceptKey: string;
  gradeLevel?: number;
  tags?: string[];
  context?: string;
}

export interface MasteryEntry {
  conceptKey: string;
  mastery: number;
}

export interface RecommendInput {
  quests: Quest[];
  masteryMap: MasteryEntry[] | null;
  recentSubjects: string[];  // subjects from most recent N sessions, newest first
  grade: number;
  effectiveGrade: number;
  interests: string[];
  topN?: number;
}

const INTEREST_CHAPTERS: Record<string, string[]> = {
  space: ['Space Explorer', 'Planet Patrol', 'Robot Trainer', 'AI Lab'],
  gaming: ['Minecraft Builder', 'Pattern Detective', 'Code Architect', 'Algorithm Arena', 'Debug Quest'],
  animals: ['Nature Explorer', 'Body Detective', 'Ecosystem Explorer', 'Bug Hunter', 'Genetics Lab'],
  cooking: ['Kitchen Scientist', 'Money Master'],
  sports: ['Playground Lab', 'Minecraft Builder'],
  youtube: ['Story Detective', 'Word Wizard', 'Data Detective'],
  robots: ['Robot Trainer', 'Code Architect', 'AI Lab', 'Algorithm Arena', 'Debug Quest'],
  money: ['Money Master', 'Market Explorer', 'Market Maker'],
};

export function recommendQuests(input: RecommendInput): Quest[] {
  const {
    quests,
    masteryMap,
    recentSubjects,
    grade,
    effectiveGrade,
    interests,
    topN = 3,
  } = input;

  const masteryLookup = new Map<string, number>();
  for (const m of masteryMap ?? []) masteryLookup.set(m.conceptKey, m.mastery);

  const interestChapters = new Set<string>();
  for (const interest of interests ?? []) {
    for (const ch of INTEREST_CHAPTERS[interest] ?? []) interestChapters.add(ch);
  }

  // Subject from the most recent session
  const mostRecentSubject = recentSubjects[0] ?? null;
  // Whether the user has been doing the same subject >=3 consecutive times
  const sameSubjectRun = recentSubjects.length >= 3 &&
    recentSubjects.slice(0, 3).every((s) => s === mostRecentSubject);

  const minGrade = Math.max(3, grade - 1);
  const maxGrade = effectiveGrade + 1;

  // Grade-range filtered quests
  const eligible = quests.filter((q) => {
    if (q.gradeLevel != null && (q.gradeLevel < minGrade || q.gradeLevel > maxGrade)) return false;
    return true;
  });

  // Score each quest
  const scored: Array<{ quest: Quest; score: number }> = eligible.map((q) => {
    let score = 0;
    const mastery = masteryLookup.get(q.conceptKey) ?? null;

    // Mastery gap (in-progress, needs reinforcement)
    if (mastery !== null && mastery >= 15 && mastery < 40) score += 30;
    // Fresh concept
    else if (mastery === null || mastery < 15) score += 20;
    // Completed concepts get 0 — they're still eligible but deprioritised

    // Variety nudge: break monotony if stuck in one subject
    if (sameSubjectRun && q.subject !== mostRecentSubject) score += 25;
    // Subject momentum: if user recently did this subject, continue the flow
    else if (!sameSubjectRun && q.subject === mostRecentSubject) score += 15;

    // Interest alignment
    if (q.chapter && interestChapters.has(q.chapter)) score += 10;

    return { quest: q, score };
  });

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);

  // Deduplicate by conceptKey (keep highest scorer per concept)
  const seen = new Set<string>();
  const deduped: Quest[] = [];
  for (const { quest } of scored) {
    if (!seen.has(quest.conceptKey)) {
      seen.add(quest.conceptKey);
      deduped.push(quest);
      if (deduped.length >= topN) break;
    }
  }

  return deduped;
}
