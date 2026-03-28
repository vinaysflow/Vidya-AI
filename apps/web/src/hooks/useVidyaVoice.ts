import { useRef, useCallback, useState, useEffect } from 'react';
import { getApiBase, getJsonHeaders } from '../lib/api';
import { useBrowserTTS } from './useBrowserTTS';

export interface VoicePlayOptions {
  tone?: 'supportive' | 'celebratory' | 'patient' | 'challenging';
  speed?: number;
  calmMode?: boolean;
  language?: string;
  subject?: string;
}

export interface UseVidyaVoiceReturn {
  play: (text: string, options?: VoicePlayOptions) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  isUnavailable: boolean;
}

function sleep(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

export function useVidyaVoice(): UseVidyaVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const browserTTS = useBrowserTTS();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    browserTTS.stop();
    if (mountedRef.current) {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [browserTTS]);

  const play = useCallback(
    async (text: string, options: VoicePlayOptions = {}) => {
      stop();

      const myGeneration = generationRef.current;

      if (!mountedRef.current) return;
      setIsLoading(true);
      setIsUnavailable(false);

      // Check cache first
      const cacheKey = `${text}::${JSON.stringify(options)}`;
      const cachedUrl = cacheRef.current.get(cacheKey);

      if (cachedUrl) {
        if (generationRef.current !== myGeneration) return;
        if (!mountedRef.current) return;
        setIsLoading(false);
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        audio.onended = () => {
          if (mountedRef.current && generationRef.current === myGeneration) {
            setIsPlaying(false);
          }
        };
        try {
          await audio.play();
          if (mountedRef.current && generationRef.current === myGeneration) {
            setIsPlaying(true);
          }
        } catch {
          if (mountedRef.current) setIsPlaying(false);
        }
        return;
      }

      // Fetch from API with 1.5s timeout race for browser TTS fallback
      const fetchAudio = async (): Promise<ArrayBuffer | null> => {
        try {
          const response = await fetch(`${getApiBase()}/api/voice/synthesize`, {
            method: 'POST',
            headers: getJsonHeaders(),
            body: JSON.stringify({
              text,
              language: options.language ?? 'EN',
              subject: options.subject ?? 'MATHEMATICS',
              tone: options.tone ?? 'supportive',
              speed: options.speed ?? 0.9,
              calmMode: options.calmMode ?? false,
            }),
          });
          if (!response.ok) throw new Error(`TTS API error ${response.status}`);
          return await response.arrayBuffer();
        } catch (err) {
          return Promise.reject(err);
        }
      };

      let timedOut = false;
      const timeoutResult = sleep(1500).then(() => {
        timedOut = true;
        return null;
      });

      let arrayBuffer: ArrayBuffer | null = null;
      try {
        arrayBuffer = await Promise.race([fetchAudio(), timeoutResult]);
      } catch (err) {
        // Hard API failure
        if (mountedRef.current) {
          setIsLoading(false);
          setIsUnavailable(true);
        }
        browserTTS.speak(text);
        return;
      }

      if (timedOut || arrayBuffer === null) {
        // Timeout -- fire browser TTS immediately, but keep fetching in background
        if (mountedRef.current && generationRef.current === myGeneration) {
          setIsLoading(false);
          browserTTS.speak(text);
        }
        // Continue fetching in background to populate cache
        fetchAudio()
          .then((buf) => {
            if (buf && generationRef.current === myGeneration) {
              const blob = new Blob([buf], { type: 'audio/mpeg' });
              const url = URL.createObjectURL(blob);
              cacheRef.current.set(cacheKey, url);
            }
          })
          .catch(() => {});
        return;
      }

      // Got audio before timeout
      if (generationRef.current !== myGeneration) return;
      if (!mountedRef.current) return;

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Revoke previous cached url for this key if any
      const prevUrl = cacheRef.current.get(cacheKey);
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      cacheRef.current.set(cacheKey, url);

      setIsLoading(false);

      if (generationRef.current !== myGeneration) {
        URL.revokeObjectURL(url);
        return;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (mountedRef.current && generationRef.current === myGeneration) {
          setIsPlaying(false);
        }
      };
      audio.onerror = () => {
        if (mountedRef.current && generationRef.current === myGeneration) {
          setIsPlaying(false);
          setIsUnavailable(true);
        }
      };

      try {
        await audio.play();
        if (mountedRef.current && generationRef.current === myGeneration) {
          setIsPlaying(true);
        }
      } catch {
        if (mountedRef.current && generationRef.current === myGeneration) {
          setIsPlaying(false);
        }
      }
    },
    [stop, browserTTS],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      cacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return { play, stop, isPlaying, isLoading, isUnavailable };
}
