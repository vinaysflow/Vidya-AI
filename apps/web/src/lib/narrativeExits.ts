/**
 * narrativeExits — utility to pick calm session-end narrative threads.
 *
 * Each quest theme has its own bucket of 3 closing threads. Threads rotate
 * in sequence so the same message isn't repeated on consecutive sessions.
 * Falls back to the 'default' bucket for unknown or null themes.
 *
 * P6: Neurodiverse design — predictable, calm session endings with narrative
 * continuity. No praise, no fanfare: just a sense of progress and return.
 */

const THREADS: Record<string, string[]> = {
  space: [
    "The colonists' oxygen system is coming along",
    "Mars isn't so far away now",
    'The garden on the colony needs attention next',
  ],
  cooking: [
    "The recipe's almost there",
    "The kitchen's starting to smell right",
    'One more ingredient to figure out next time',
  ],
  animals: [
    'The field guide has new entries',
    'The habitat map is filling in',
    'There are more tracks to follow',
  ],
  sports: [
    "The stats are starting to tell a story",
    'The game plan is taking shape',
    "There's one more play to work out",
  ],
  gaming: [
    'The redstone is almost wired up',
    'One more level to figure out',
    'The ratios are coming together',
  ],
  robots: [
    "The robot's decisions are getting better",
    'The training data is adding up',
    'One more behavior to teach it',
  ],
  money: [
    "The stand's starting to break even",
    'The numbers are coming together',
    'One more trade to figure out',
  ],
  youtube: [
    "The channel's growing",
    'The audience math is clicking',
    'One more script to work out',
  ],
  default: [
    "Something's clicking",
    'The pieces are coming together',
    "There's more to figure out next time",
  ],
};

const rotationIndex = new Map<string, number>();

export function pickExitThread(theme: string | null): string {
  const key = theme && THREADS[theme] ? theme : 'default';
  const bucket = THREADS[key];
  const prev = rotationIndex.get(key) ?? -1;
  const idx = (prev + 1) % bucket.length;
  rotationIndex.set(key, idx);
  return bucket[idx];
}
