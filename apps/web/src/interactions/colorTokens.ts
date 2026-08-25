/**
 * Map common color words to a CSS color so color-answers actually SHOW the
 * color (e.g. a "Red" choice gets a red swatch; a red/blue pattern renders as
 * colored tiles). Shared by the pattern primitive and the choice cards.
 */
const COLOR_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  violet: '#8b5cf6',
  pink: '#ec4899',
  brown: '#92400e',
  black: '#111827',
  white: '#f8fafc',
  gray: '#9ca3af',
  grey: '#9ca3af',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  gold: '#f59e0b',
  silver: '#cbd5e1',
};

/** Returns a CSS color for a single color-word label, or null if not a color. */
export function colorOf(label: string | null | undefined): string | null {
  if (!label) return null;
  const key = label.trim().toLowerCase().replace(/[^a-z]/g, '');
  return COLOR_HEX[key] ?? null;
}

/** Light fills (white/silver/yellow) need a dark border/check to stay visible. */
export function isLightColor(hex: string): boolean {
  return ['#f8fafc', '#cbd5e1', '#eab308'].includes(hex);
}
