import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  autoPlay?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({ audioUrl, autoPlay }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [autoPlay, audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
          }
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={togglePlay} className="p-1 text-slate-600 dark:text-slate-300">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <div className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <button
        onClick={cycleSpeed}
        className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1"
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  );
}
