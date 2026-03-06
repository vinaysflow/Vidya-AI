export const CHAPTER_THEMES: Record<string, {
  bg: string;
  border: string;
  accent: string;
  emoji: string;
  /** Static scene background (optional). Add webp to public/scenes/ for instant load. */
  sceneImage?: string;
}> = {
  'Minecraft Builder': {
    bg: 'from-gray-900 via-green-900 to-gray-800',
    border: 'border-green-500',
    accent: 'bg-green-600',
    emoji: '⛏️',
  },
  'Kitchen Scientist': {
    bg: 'from-amber-100 via-orange-100 to-yellow-50',
    border: 'border-orange-400',
    accent: 'bg-orange-500',
    emoji: '🧪',
  },
  'Playground Lab': {
    bg: 'from-sky-200 via-blue-100 to-emerald-100',
    border: 'border-sky-400',
    accent: 'bg-sky-500',
    emoji: '🎢',
  },
  'Pattern Detective': {
    bg: 'from-purple-100 via-pink-100 to-indigo-100',
    border: 'border-purple-400',
    accent: 'bg-purple-500',
    emoji: '🔍',
  },
  'Nature Explorer': {
    bg: 'from-green-200 via-emerald-100 to-lime-100',
    border: 'border-emerald-400',
    accent: 'bg-emerald-500',
    emoji: '🌿',
  },
  Adventures: {
    bg: 'from-amber-100 via-orange-50 to-yellow-50',
    border: 'border-amber-400',
    accent: 'bg-amber-500',
    emoji: '✨',
  },
};

export function getTheme(chapter: string) {
  return CHAPTER_THEMES[chapter] ?? CHAPTER_THEMES.Adventures;
}

export function parseChoices(content: string): { narrative: string; choices: { letter: string; text: string }[] } {
  // Primary format: [A] text
  const bracketRegex = /\[([A-C])\]\s*(.+?)(?=\s*\[[A-C]\]|\s*$)/gs;
  const bracketMatches = [...content.matchAll(bracketRegex)];

  if (bracketMatches.length > 0) {
    const firstIdx = content.search(/\[[A-C]\]/);
    return {
      narrative: content.slice(0, firstIdx).trim(),
      choices: bracketMatches.map((m) => ({ letter: m[1], text: m[2].trim().replace(/\s+/g, ' ') })),
    };
  }

  // Fallback: A) text or (A) text or A. text
  const altRegex = /(?:^|\n)\s*\(?([A-C])[).]\s+(.+)/gm;
  const altMatches = [...content.matchAll(altRegex)];

  if (altMatches.length >= 2) {
    const firstIdx = content.search(/(?:^|\n)\s*\(?[A-C][).]\s/m);
    return {
      narrative: content.slice(0, Math.max(0, firstIdx)).trim(),
      choices: altMatches.map((m) => ({ letter: m[1], text: m[2].trim().replace(/\s+/g, ' ') })),
    };
  }

  return { narrative: content.trim(), choices: [] };
}
