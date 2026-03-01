import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface VoiceButtonProps {
  language: string;
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ language, onTranscription, disabled }: VoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setProcessing(true);

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          formData.append('language', language);

          const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.text) {
            onTranscription(data.text);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [language, onTranscription]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
  }, []);

  const handleClick = () => {
    if (processing || disabled) return;
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <button
      onClick={handleClick}
      disabled={processing || disabled}
      className={`p-2.5 rounded-xl transition-all ${
        recording
          ? 'bg-red-500 text-white animate-pulse'
          : processing
          ? 'bg-slate-300 dark:bg-slate-600 text-slate-500'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      }`}
      title={recording ? 'Stop recording' : 'Start recording'}
    >
      {processing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
