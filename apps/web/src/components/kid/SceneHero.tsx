/**
 * SceneHero — the kid's avatar (RM) as a small COACH in the corner of the scene.
 *
 * It used to stand dead-center and cover the play area; now it sits tucked into
 * the bottom-right as a sidekick that reacts to answers, keeping the middle of
 * the scene clear for the actual content (manipulatives, pattern tiles, etc.):
 *   - correct → cheers: jump, gold glow, power rings, sparkles + a "Yes!" pop
 *   - wrong   → a brief stumble/tilt (never punishing)
 *   - loading → a thinking sway
 */

import { cn } from '../../lib/utils';
import type { CompanionMood } from './Companion';

const MOOD_ANIM: Record<CompanionMood, string> = {
  idle: 'animate-[vidya-bounce_2.8s_ease-in-out_infinite]',
  talk: 'animate-[vidya-talk_0.5s_ease-in-out_infinite]',
  happy: 'animate-[vidya-jump_0.6s_ease-out]',
  think: 'animate-[vidya-think_1.6s_ease-in-out_infinite]',
  oops: 'animate-[vidya-tilt_0.6s_ease-in-out]',
};

const MOOD_CHEER: Partial<Record<CompanionMood, string>> = {
  happy: 'Yes!',
  oops: 'Try again!',
};

interface SceneHeroProps {
  src: string;
  mood: CompanionMood;
  className?: string;
}

export function SceneHero({ src, mood, className }: SceneHeroProps) {
  const happy = mood === 'happy';
  const oops = mood === 'oops';
  const cheer = MOOD_CHEER[mood];

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-1 right-1 z-10 flex h-[78%] w-20 items-end justify-center sm:w-24',
        className
      )}
    >
      {/* Speech pop on a reaction */}
      {cheer && (
        <span
          className={cn(
            'absolute -top-1 right-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md animate-[comboPop_0.4s_ease-out]',
            happy ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        >
          {cheer}
        </span>
      )}

      {/* Spotlight glow behind the coach — warms up on a win */}
      <div
        className={cn(
          'absolute bottom-1 h-2/3 w-full rounded-full blur-2xl transition-all duration-300',
          happy ? 'bg-amber-300/60 opacity-100' : oops ? 'bg-rose-400/30 opacity-80' : 'bg-sky-300/15 opacity-50'
        )}
      />

      {/* Power rings on a correct answer */}
      {happy && (
        <>
          <span className="absolute bottom-2 h-14 w-14 rounded-full border-[3px] border-amber-300/80 animate-[heroPowerRing_0.7s_ease-out]" />
          <span className="absolute bottom-2 h-14 w-14 rounded-full border-[3px] border-emerald-300/70 animate-[heroPowerRing_0.7s_ease-out_0.12s]" />
        </>
      )}

      {/* The coach */}
      <img
        src={src}
        alt="Your buddy"
        draggable={false}
        className={cn('relative h-full w-auto select-none object-contain', MOOD_ANIM[mood])}
        style={{
          filter: happy
            ? 'drop-shadow(0 4px 7px rgba(0,0,0,0.4)) drop-shadow(0 0 12px #fbbf24)'
            : 'drop-shadow(0 4px 7px rgba(0,0,0,0.4))',
        }}
      />

      {/* Sparkle burst on a win */}
      {happy && (
        <>
          <span className="absolute left-1 top-2 text-lg animate-ping" style={{ animationDuration: '0.7s' }}>✦</span>
          <span className="absolute right-0 top-5 text-base text-amber-300 animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.1s' }}>★</span>
        </>
      )}
    </div>
  );
}
