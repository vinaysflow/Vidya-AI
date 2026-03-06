import { useState } from 'react';
import { Volume2, Loader2 as AudioLoader } from 'lucide-react';
import { MathRenderer } from '../MathRenderer';
import { cn } from '../../lib/utils';
import { WhiteboardContainer } from '../whiteboard/WhiteboardContainer';
import { AudioPlayer } from '../voice/AudioPlayer';
import { useChatStore, useIsKidMode } from '../../stores/chatStore';
import { ParentInsightPanel } from './ParentInsightPanel';
import { VOICE_ENABLED } from '../../lib/featureFlags';
import { getApiBase, getJsonHeaders } from '../../lib/api';

const API_BASE = getApiBase();

const ttsCache = new Map<string, string>();

export interface MessageData {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  language?: string;
  imageUrl?: string;
  audioUrl?: string;
  metadata?: {
    questionType?: string;
    topic?: string;
    hintLevel?: number;
    distanceFromSolution?: number;
    readiness?: number;
    conceptsIdentified?: string[];
    grounding?: 'bank' | 'reasoned' | 'retrieved';
    confidence?: number;
    visualContent?: { type: string; data: any };
  };
  timestamp?: Date;
}

interface MessageProps {
  message: MessageData;
}

const KID_HEADERS: Record<string, string> = {
  celebration: '🎉 Amazing!',
  celebrate_then_explain_back: '🤖 Teach the robot!',
  socratic: '🤔 Think about this…',
  hint_with_question: '🤔 Think about this…',
  foundational: "💡 Let's figure it out!",
  attempt_prompt: '✋ Your turn!',
  encouragement: "🌟 You're doing great!",
};

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isKidMode = useIsKidMode();
  const questionType = message.metadata?.questionType;
  const kidHeader = isKidMode && !isUser && questionType ? KID_HEADERS[questionType] : null;
  const hintLevel = message.metadata?.hintLevel || 0;
  const topic = message.metadata?.topic;
  const distance = message.metadata?.distanceFromSolution;
  const { voiceEnabled, subject, language, parentViewEnabled } = useChatStore();
  const [audioUrl, setAudioUrl] = useState<string | null>(message.audioUrl || null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const showVoice = VOICE_ENABLED && voiceEnabled && !isUser;

  const handleSynthesize = async () => {
    if (audioUrl || ttsLoading) return;
    const cacheKey = message.id || message.content.slice(0, 100);
    const cached = ttsCache.get(cacheKey);
    if (cached) { setAudioUrl(cached); return; }

    setTtsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/voice/synthesize`, {
        method: 'POST',
        headers: getJsonHeaders(),
        body: JSON.stringify({
          text: message.content.slice(0, 4000),
          language,
          subject,
        }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      ttsCache.set(cacheKey, url);
      setAudioUrl(url);
    } catch (err) {
      console.error('TTS synthesis error:', err);
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className={cn(
      "flex w-full animate-fade-in",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] sm:max-w-[75%]",
        "rounded-2xl px-4 py-3",
        "shadow-sm",
        isUser
          ? isKidMode
            ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-br-md"
            : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
          : isKidMode
            ? "bg-amber-50/80 dark:bg-amber-900/10 text-slate-800 dark:text-slate-100 rounded-bl-md border border-amber-200/60 dark:border-amber-800/40"
            : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-600"
      )}>
        {message.imageUrl && (
          <div className="mb-3">
            <img
              src={message.imageUrl}
              alt="Attached"
              className="max-h-48 rounded-lg border border-white/20 object-contain"
            />
          </div>
        )}

        {kidHeader && (
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-2">
            {kidHeader}
          </div>
        )}

        <div className={cn(
          "max-w-none",
          isKidMode ? "text-base" : "prose prose-sm",
          (isKidMode && isUser) ? "prose-invert" : isKidMode ? "" : isUser ? "prose-invert" : "dark:prose-invert"
        )}>
          <MathRenderer content={message.content} />
        </div>

        {!isUser && message.metadata?.visualContent && (
          <div className="mt-3 rounded-xl border border-slate-200/60 dark:border-slate-600/60 bg-slate-50/50 dark:bg-slate-800/50 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">Visual</span>
            <WhiteboardContainer content={message.metadata.visualContent as any} />
          </div>
        )}

        {showVoice && (
          <div className="mt-2">
            {audioUrl ? (
              <AudioPlayer audioUrl={audioUrl} />
            ) : (
              <button
                onClick={handleSynthesize}
                disabled={ttsLoading}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
              >
                {ttsLoading ? (
                  <AudioLoader className="h-3 w-3 animate-spin" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
                Listen
              </button>
            )}
          </div>
        )}

        {/* Hint level indicator - hidden in kid mode */}
        {!isUser && !isKidMode && hintLevel > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Hint:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    level <= hintLevel ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-600"
                  )} />
                ))}
              </div>
              <span className="text-[10px] text-slate-400">{hintLevel}/5</span>
            </div>
          </div>
        )}

        {/* Parent insight panel - kid mode only, when parent view enabled */}
        {!isUser && isKidMode && parentViewEnabled && (
          <ParentInsightPanel
            questionType={message.metadata?.questionType}
            distanceFromSolution={message.metadata?.distanceFromSolution}
            hintLevel={message.metadata?.hintLevel}
            conceptsIdentified={message.metadata?.conceptsIdentified}
          />
        )}

        {/* Topic + progress badges - hidden in kid mode */}
        {!isUser && !isKidMode && (topic || (distance !== undefined && distance < 100)) && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {topic && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                {topic.replace(/_/g, ' ')}
              </span>
            )}
            {distance !== undefined && distance <= 30 && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300">
                {distance <= 15 ? 'Almost there!' : 'Getting close'}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
