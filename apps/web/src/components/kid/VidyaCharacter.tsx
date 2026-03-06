/**
 * VidyaCharacter — friendly rounded NPC for kid mode quests.
 * Duolingo-inspired design: big round eyes, soft body, expressive states.
 * CSS keyframe animations for all 4 states — no external assets required.
 */
import { cn } from '../../lib/utils';

export type VidyaState = 'idle' | 'talking' | 'celebrating' | 'puzzled' | 'thinking';

interface VidyaCharacterProps {
  state?: VidyaState;
  className?: string;
}

const STATE_ANIMATIONS: Record<VidyaState, string> = {
  idle: 'animate-[vidya-bounce_2.5s_ease-in-out_infinite]',
  talking: 'animate-[vidya-talk_0.45s_ease-in-out_infinite]',
  celebrating: 'animate-[vidya-jump_0.5s_ease-out]',
  puzzled: 'animate-[vidya-tilt_1.2s_ease-in-out_infinite]',
  thinking: 'animate-[vidya-think_1.5s_ease-in-out_infinite]',
};

export function VidyaCharacter({ state = 'idle', className }: VidyaCharacterProps) {
  const animClass = STATE_ANIMATIONS[state];
  const isTalking = state === 'talking';
  const isCelebrating = state === 'celebrating';
  const isPuzzled = state === 'puzzled';
  const isThinking = state === 'thinking';

  // Eye blink — different open/closed shape per state
  const eyeRy = isTalking ? 3 : 5;

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      <svg
        viewBox="0 0 56 56"
        className={cn('h-full w-full', animClass)}
        aria-hidden
        style={{ filter: isCelebrating ? 'drop-shadow(0 0 6px #fbbf24)' : undefined }}
      >
        {/* ── Body: rounded pill ── */}
        <rect x="14" y="30" width="28" height="22" rx="10" fill="currentColor" />

        {/* ── Arms ── */}
        {isCelebrating ? (
          <>
            {/* Arms up for celebration */}
            <line x1="14" y1="34" x2="4" y2="22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="42" y1="34" x2="52" y2="22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Arms at side / slightly out */}
            <line x1="14" y1="36" x2="5" y2="42" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="42" y1="36" x2="51" y2="42" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )}

        {/* ── Head: large circle ── */}
        <circle cx="28" cy="21" r="17" fill="currentColor" />

        {/* ── Eyes: big, round, expressive ── */}
        {/* Left eye white */}
        <ellipse cx="21" cy="20" rx="5" ry={eyeRy} fill="white" />
        {/* Right eye white */}
        <ellipse cx="35" cy="20" rx="5" ry={eyeRy} fill="white" />
        {/* Pupils */}
        {!isPuzzled && !isThinking && (
          <>
            <circle cx={isTalking ? 21 : 22} cy="21" r="2.5" fill="#1e293b" />
            <circle cx={isTalking ? 35 : 36} cy="21" r="2.5" fill="#1e293b" />
            {/* Shine dots */}
            <circle cx={isTalking ? 22 : 23} cy="19" r="1" fill="white" opacity={0.9} />
            <circle cx={isTalking ? 36 : 37} cy="19" r="1" fill="white" opacity={0.9} />
          </>
        )}
        {/* Thinking eyes — looking up and to the right */}
        {isThinking && (
          <>
            <circle cx="23" cy="18" r="2.5" fill="#1e293b" />
            <circle cx="37" cy="18" r="2.5" fill="#1e293b" />
            <circle cx="24" cy="17" r="1" fill="white" opacity={0.9} />
            <circle cx="38" cy="17" r="1" fill="white" opacity={0.9} />
          </>
        )}
        {/* Puzzled X-eyes */}
        {isPuzzled && (
          <>
            <line x1="18" y1="17" x2="24" y2="23" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="24" y1="17" x2="18" y2="23" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="32" y1="17" x2="38" y2="23" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="38" y1="17" x2="32" y2="23" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* ── Mouth ── */}
        {isTalking && (
          /* Open oval mouth */
          <ellipse cx="28" cy="29" rx="5" ry="3.5" fill="#1e293b" />
        )}
        {isCelebrating && (
          /* Big happy grin */
          <path d="M20,28 Q28,36 36,28" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {isPuzzled && (
          /* Wavy uncertain mouth */
          <path d="M21,29 Q24,27 28,29 Q32,31 35,29" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {isThinking && (
          /* Small oval thinking mouth */
          <ellipse cx="28" cy="30" rx="3" ry="2" fill="#1e293b" />
        )}
        {!isTalking && !isCelebrating && !isPuzzled && !isThinking && (
          /* Neutral smile */
          <path d="M22,28 Q28,33 34,28" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}

        {/* ── Blush cheeks (celebrating / happy) ── */}
        {(isCelebrating || state === 'idle') && (
          <>
            <ellipse cx="16" cy="25" rx="4" ry="2.5" fill="#f9a8d4" opacity={0.5} />
            <ellipse cx="40" cy="25" rx="4" ry="2.5" fill="#f9a8d4" opacity={0.5} />
          </>
        )}

        {/* ── Puzzled question mark ── */}
        {isPuzzled && (
          <text x="28" y="10" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fbbf24" fontFamily="sans-serif">?</text>
        )}
      </svg>

      {/* Celebration burst stars */}
      {isCelebrating && (
        <>
          <span className="pointer-events-none absolute -top-2 -right-1 text-amber-400 text-base animate-ping" style={{ animationDuration: '0.6s' }}>✦</span>
          <span className="pointer-events-none absolute -top-3 left-0 text-yellow-300 text-sm animate-ping" style={{ animationDelay: '100ms', animationDuration: '0.7s' }}>★</span>
          <span className="pointer-events-none absolute top-0 -left-2 text-orange-400 text-xs animate-ping" style={{ animationDelay: '200ms', animationDuration: '0.5s' }}>✦</span>
        </>
      )}

      {/* Thought bubble when thinking */}
      {isThinking && (
        <div className="pointer-events-none absolute -top-5 -right-1 flex flex-col items-end gap-0.5">
          <span className="text-slate-400 text-xs font-bold animate-[vidya-bounce_0.8s_ease-in-out_infinite]">...</span>
        </div>
      )}
    </div>
  );
}
