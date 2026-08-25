/**
 * Companion — the kid's persistent learning buddy (avatar scaffold).
 *
 * This is the visual embodiment of the teachable-agent BuddyState from the
 * learner model. It is deliberately asset-free (built on the tintable
 * VidyaCharacter SVG) so it costs nothing and works offline, while being
 * structured so a richer 2.5D/3D model can drop in later (swap the inner
 * <VidyaCharacter/> for a canvas/Three renderer without touching callers).
 *
 * It conveys progression three ways:
 *   - tier color + aura that level up as the buddy grows
 *   - a level badge
 *   - a cosmetic that unlocks at higher tiers (headphones → cap → crown)
 *
 * And it conveys live game-feel via `mood`, which maps to expressive states
 * and reacts to the kid's last answer.
 */

import { cn } from '../../lib/utils';
import { VidyaCharacter, type VidyaState } from './VidyaCharacter';

export type CompanionMood = 'idle' | 'happy' | 'think' | 'oops' | 'talk';

interface CompanionProps {
  level: number;
  mood?: CompanionMood;
  /** Pixel size of the avatar disc. */
  size?: number;
  /** Show the "Lv N" badge. */
  showLevel?: boolean;
  /**
   * Optional character art (transparent PNG). When set, the companion shows the
   * real avatar (e.g. the RM hero) instead of the generic SVG buddy.
   */
  imageSrc?: string;
  /**
   * 'portrait' crops to the head/shoulders for the small HUD disc; 'full' shows
   * the whole body (for big moments like the level-up celebration).
   */
  variant?: 'portrait' | 'full';
  className?: string;
}

// Mood → CSS animation for the image-based avatar (reuses the vidya-* keyframes).
const MOOD_TO_IMG_ANIM: Record<CompanionMood, string> = {
  idle: 'animate-[vidya-bounce_2.8s_ease-in-out_infinite]',
  talk: 'animate-[vidya-talk_0.5s_ease-in-out_infinite]',
  happy: 'animate-[vidya-jump_0.6s_ease-out]',
  think: 'animate-[vidya-think_1.6s_ease-in-out_infinite]',
  oops: 'animate-[vidya-tilt_1s_ease-in-out_infinite]',
};

interface Tier {
  /** Tailwind text-color class — drives VidyaCharacter's currentColor. */
  color: string;
  /** Ring gradient classes. */
  ring: string;
  /** Cosmetic unlocked at this tier. */
  cosmetic: 'none' | 'headphones' | 'cap' | 'crown';
  /** Soft glow behind the avatar at higher tiers. */
  aura: boolean;
}

function tierForLevel(level: number): Tier {
  if (level >= 8) return { color: 'text-amber-400', ring: 'from-amber-300 to-yellow-500', cosmetic: 'crown', aura: true };
  if (level >= 6) return { color: 'text-violet-400', ring: 'from-violet-300 to-fuchsia-500', cosmetic: 'cap', aura: true };
  if (level >= 4) return { color: 'text-emerald-400', ring: 'from-emerald-300 to-teal-500', cosmetic: 'cap', aura: false };
  if (level >= 2) return { color: 'text-sky-400', ring: 'from-sky-300 to-blue-500', cosmetic: 'headphones', aura: false };
  return { color: 'text-sky-300', ring: 'from-slate-200 to-slate-400', cosmetic: 'none', aura: false };
}

const MOOD_TO_STATE: Record<CompanionMood, VidyaState> = {
  idle: 'idle',
  happy: 'celebrating',
  think: 'thinking',
  oops: 'puzzled',
  talk: 'talking',
};

function Cosmetic({ kind }: { kind: Tier['cosmetic'] }) {
  if (kind === 'none') return null;
  // Positioned over the head of the 56x56 VidyaCharacter viewBox region.
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
      <div className="mt-[6%] text-center leading-none" style={{ fontSize: '34%' }}>
        {kind === 'headphones' && <span>🎧</span>}
        {kind === 'cap' && <span>🧢</span>}
        {kind === 'crown' && <span>👑</span>}
      </div>
    </div>
  );
}

export function Companion({
  level,
  mood = 'idle',
  size = 48,
  showLevel = true,
  imageSrc,
  variant = 'portrait',
  className,
}: CompanionProps) {
  const tier = tierForLevel(level);
  const state = MOOD_TO_STATE[mood];
  const isFull = variant === 'full';

  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {/* Aura for high tiers */}
      {tier.aura && (
        <div className={cn('absolute inset-0 rounded-full bg-gradient-to-br opacity-40 blur-md', tier.ring)} />
      )}
      {/* Gradient ring */}
      <div className={cn('relative h-full w-full rounded-full bg-gradient-to-br p-[2px] shadow-md', tier.ring)}>
        <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Your buddy"
              draggable={false}
              className={cn('h-full w-full select-none', isFull ? 'object-contain' : 'object-cover', MOOD_TO_IMG_ANIM[mood])}
              // Frame the head/shoulders for the small circular HUD disc.
              style={isFull ? undefined : { objectPosition: '50% 0%', transform: 'scale(1.05)' }}
            />
          ) : (
            <>
              <VidyaCharacter state={state} className={cn('h-full w-full', tier.color)} />
              <Cosmetic kind={tier.cosmetic} />
            </>
          )}
        </div>
      </div>
      {/* Level badge */}
      {showLevel && (
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-slate-900 px-1.5 text-[9px] font-extrabold leading-none text-white shadow ring-2 ring-white dark:ring-slate-800"
          style={{ minWidth: 18, height: 16 }}
        >
          {level}
        </div>
      )}
    </div>
  );
}
