import { useEffect, useState } from 'react';
import { TutorAvatar, type AvatarState } from './TutorAvatar';

interface AvatarReactionsProps {
  isLoading: boolean;
  hasMessages: boolean;
  isSessionEnded: boolean;
  recentXp?: number;
}

export function AvatarReactions({
  isLoading,
  hasMessages,
  isSessionEnded,
  recentXp,
}: AvatarReactionsProps) {
  const [state, setState] = useState<AvatarState>('idle');

  useEffect(() => {
    if (isSessionEnded) {
      setState('celebrating');
      return;
    }
    if (recentXp && recentXp > 0) {
      setState('celebrating');
      const t = setTimeout(() => setState('idle'), 2000);
      return () => clearTimeout(t);
    }
    if (isLoading) {
      setState('thinking');
      return;
    }
    if (!hasMessages) {
      setState('waving');
      return;
    }
    setState('idle');
  }, [isLoading, hasMessages, isSessionEnded, recentXp]);

  return <TutorAvatar state={state} size="sm" />;
}
