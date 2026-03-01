
import { Sparkles, Brain, PartyPopper, HelpCircle, Hand } from 'lucide-react';

export type AvatarState = 'idle' | 'thinking' | 'celebrating' | 'puzzled' | 'waving' | 'pointing';
export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStyle = 'human' | 'robot' | 'owl' | 'orb';

interface TutorAvatarProps {
  state?: AvatarState;
  size?: AvatarSize;
  style?: AvatarStyle;
}

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const STATE_ICONS: Record<AvatarState, any> = {
  idle: Sparkles,
  thinking: Brain,
  celebrating: PartyPopper,
  puzzled: HelpCircle,
  waving: Hand,
  pointing: Hand,
};

const STATE_COLORS: Record<AvatarState, string> = {
  idle: 'from-blue-500 to-purple-600',
  thinking: 'from-amber-500 to-orange-600',
  celebrating: 'from-green-500 to-emerald-600',
  puzzled: 'from-pink-500 to-rose-600',
  waving: 'from-blue-500 to-indigo-600',
  pointing: 'from-cyan-500 to-blue-600',
};

const STATE_ANIMATIONS: Record<AvatarState, string> = {
  idle: 'animate-pulse',
  thinking: 'animate-spin-slow',
  celebrating: 'animate-bounce',
  puzzled: 'animate-wiggle',
  waving: 'animate-wave',
  pointing: '',
};

/**
 * Tutor avatar using CSS animations as fallback.
 * When Lottie JSON assets are placed in public/avatars/, this can be upgraded to use lottie-react.
 */
export function TutorAvatar({ state = 'idle', size = 'md', style: _style = 'orb' }: TutorAvatarProps) {
  const Icon = STATE_ICONS[state];
  const sizeClass = SIZE_MAP[size];
  const colorClass = STATE_COLORS[state];
  const animClass = STATE_ANIMATIONS[state];

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-7 w-7' : 'h-10 w-10';

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg ${animClass} transition-all duration-300`}
    >
      <Icon className={`${iconSize} text-white`} />
    </div>
  );
}
