import { useRef, useCallback, useEffect } from 'react';

const PREFERRED_VOICES = ['Google US English', 'Samantha'];

function selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICES) {
    const found = voices.find((v) => v.name === name);
    if (found) return found;
  }
  // Fall back to first English voice
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

export function useBrowserTTS() {
  const isSupported = typeof window !== 'undefined' && !!window.speechSynthesis;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    const tryLoadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = selectVoice(voices);
      }
    };

    tryLoadVoices();

    // getVoices() is async -- listen for voiceschanged event
    window.speechSynthesis.addEventListener('voiceschanged', tryLoadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', tryLoadVoices);
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }
      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, stop, isSupported };
}
