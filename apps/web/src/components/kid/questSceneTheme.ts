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
  'Logic Detective': {
    bg: 'from-indigo-200 via-blue-100 to-violet-100',
    border: 'border-indigo-400',
    accent: 'bg-indigo-500',
    emoji: '🧠',
  },
  // Biology / Life Science
  'Body Detective': {
    bg: 'from-red-100 via-pink-100 to-rose-50',
    border: 'border-red-400',
    accent: 'bg-red-500',
    emoji: '🫀',
  },
  'Ecosystem Explorer': {
    bg: 'from-teal-200 via-green-100 to-emerald-100',
    border: 'border-teal-500',
    accent: 'bg-teal-600',
    emoji: '🌱',
  },
  'Cell Lab': {
    bg: 'from-lime-100 via-green-100 to-teal-100',
    border: 'border-lime-500',
    accent: 'bg-lime-600',
    emoji: '🔬',
  },
  'Bug Hunter': {
    bg: 'from-yellow-100 via-lime-100 to-green-100',
    border: 'border-yellow-500',
    accent: 'bg-yellow-600',
    emoji: '🐛',
  },
  'Genetics Lab': {
    bg: 'from-violet-100 via-purple-100 to-fuchsia-100',
    border: 'border-violet-400',
    accent: 'bg-violet-500',
    emoji: '🧬',
  },
  // Coding / CS
  'Code Architect': {
    bg: 'from-cyan-900 via-blue-900 to-slate-900',
    border: 'border-cyan-400',
    accent: 'bg-cyan-500',
    emoji: '💻',
  },
  'Algorithm Arena': {
    bg: 'from-slate-800 via-blue-900 to-indigo-900',
    border: 'border-blue-400',
    accent: 'bg-blue-500',
    emoji: '⚙️',
  },
  'Debug Quest': {
    bg: 'from-red-900 via-orange-900 to-amber-900',
    border: 'border-orange-400',
    accent: 'bg-orange-500',
    emoji: '🐛',
  },
  // English Literature
  'Story Detective': {
    bg: 'from-rose-100 via-pink-100 to-fuchsia-50',
    border: 'border-rose-400',
    accent: 'bg-rose-500',
    emoji: '📚',
  },
  'Story Crafter': {
    bg: 'from-pink-100 via-purple-100 to-violet-100',
    border: 'border-pink-400',
    accent: 'bg-pink-500',
    emoji: '✍️',
  },
  'Poetry Explorer': {
    bg: 'from-fuchsia-100 via-pink-100 to-rose-100',
    border: 'border-fuchsia-400',
    accent: 'bg-fuchsia-500',
    emoji: '🎭',
  },
  'Word Wizard': {
    bg: 'from-violet-100 via-purple-100 to-pink-100',
    border: 'border-violet-500',
    accent: 'bg-violet-600',
    emoji: '📖',
  },
  'Argument Builder': {
    bg: 'from-amber-100 via-orange-100 to-red-100',
    border: 'border-amber-500',
    accent: 'bg-amber-600',
    emoji: '🗣️',
  },
  // Economics
  'Money Master': {
    bg: 'from-yellow-100 via-amber-100 to-orange-50',
    border: 'border-yellow-500',
    accent: 'bg-yellow-600',
    emoji: '💰',
  },
  'Market Explorer': {
    bg: 'from-green-100 via-emerald-100 to-teal-50',
    border: 'border-green-500',
    accent: 'bg-green-600',
    emoji: '📈',
  },
  'Market Maker': {
    bg: 'from-teal-100 via-green-100 to-emerald-50',
    border: 'border-teal-400',
    accent: 'bg-teal-500',
    emoji: '🏪',
  },
  // AI / ML
  'Robot Trainer': {
    bg: 'from-violet-200 via-indigo-100 to-purple-100',
    border: 'border-violet-500',
    accent: 'bg-violet-600',
    emoji: '🤖',
  },
  'AI Lab': {
    bg: 'from-indigo-900 via-violet-900 to-purple-900',
    border: 'border-indigo-300',
    accent: 'bg-indigo-400',
    emoji: '🧠',
  },
  'Data Detective': {
    bg: 'from-blue-100 via-indigo-100 to-violet-100',
    border: 'border-blue-500',
    accent: 'bg-blue-600',
    emoji: '📊',
  },
  'Bias Detective': {
    bg: 'from-orange-100 via-amber-100 to-yellow-100',
    border: 'border-orange-400',
    accent: 'bg-orange-500',
    emoji: '🔎',
  },
  // Logic
  'Puzzle Palace': {
    bg: 'from-teal-200 via-cyan-100 to-sky-100',
    border: 'border-teal-500',
    accent: 'bg-teal-600',
    emoji: '🧩',
  },
  // Earth & Space Science
  'Space Explorer': {
    bg: 'from-slate-900 via-indigo-900 to-blue-900',
    border: 'border-indigo-400',
    accent: 'bg-indigo-500',
    emoji: '🚀',
  },
  'Planet Patrol': {
    bg: 'from-blue-900 via-purple-900 to-indigo-900',
    border: 'border-blue-300',
    accent: 'bg-blue-400',
    emoji: '🪐',
  },
  'Weather Watcher': {
    bg: 'from-sky-200 via-blue-100 to-cyan-100',
    border: 'border-sky-400',
    accent: 'bg-sky-500',
    emoji: '⛅',
  },
  // Physics / Chemistry legacy themes
  'Dragon Academy': {
    bg: 'from-red-900 via-orange-800 to-amber-700',
    border: 'border-red-400',
    accent: 'bg-red-500',
    emoji: '🐉',
  },
  'Ocean Discovery': {
    bg: 'from-blue-900 via-cyan-800 to-teal-700',
    border: 'border-cyan-400',
    accent: 'bg-cyan-500',
    emoji: '🌊',
  },
  'Enchanted Forest': {
    bg: 'from-green-900 via-emerald-800 to-teal-800',
    border: 'border-emerald-400',
    accent: 'bg-emerald-500',
    emoji: '🌲',
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
    const all = bracketMatches.map((m) => ({ letter: m[1], text: m[2].trim().replace(/\s+/g, ' ') }));
    const seen = new Set<string>();
    const unique = all.filter((c) => {
      if (seen.has(c.letter)) return false;
      seen.add(c.letter);
      return true;
    });
    return {
      narrative: content.slice(0, firstIdx).trim(),
      choices: unique.slice(0, 3),
    };
  }

  // Fallback: A) text or (A) text or A. text
  const altRegex = /(?:^|\n)\s*\(?([A-C])[).]\s+(.+)/gm;
  const altMatches = [...content.matchAll(altRegex)];

  if (altMatches.length >= 2) {
    const firstIdx = content.search(/(?:^|\n)\s*\(?[A-C][).]\s/m);
    const all = altMatches.map((m) => ({ letter: m[1], text: m[2].trim().replace(/\s+/g, ' ') }));
    const seen = new Set<string>();
    const unique = all.filter((c) => {
      if (seen.has(c.letter)) return false;
      seen.add(c.letter);
      return true;
    });
    return {
      narrative: content.slice(0, Math.max(0, firstIdx)).trim(),
      choices: unique.slice(0, 3),
    };
  }

  return { narrative: content.trim(), choices: [] };
}
