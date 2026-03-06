import { useEffect, useState, useCallback, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { VidyaCharacter, type VidyaState } from './VidyaCharacter';
import { cn } from '../../lib/utils';
import { getTheme, parseChoices } from './questSceneTheme';
import { useChatStore, type Message } from '../../stores/chatStore';
import { VoiceButton } from '../voice/VoiceButton';
import { StudentCanvas } from '../whiteboard/StudentCanvas';
import { WhiteboardContainer } from '../whiteboard/WhiteboardContainer';
import { getApiBase, getJsonHeaders } from '../../lib/api';

const API_BASE = getApiBase();
const KID_HEADERS: Record<string, string> = {
  celebration: 'Amazing!',
  celebrate_then_explain_back: 'Teach the robot!',
  socratic: 'Think about this…',
  hint_with_question: 'Think about this…',
  foundational: "Let's figure it out!",
  attempt_prompt: 'Your turn!',
  encouragement: "You're doing great!",
};

interface QuestSceneProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, image?: string) => void;
  onEndSession: () => void;
}

export function QuestScene({ messages, isLoading, onSendMessage, onEndSession }: QuestSceneProps) {
  const {
    activeQuest,
    sceneImageUrl,
    setSceneImageUrl,
    setScenePhase,
    lastChoiceCorrect,
    setLastChoiceCorrect,
    incrementCombo,
    resetCombo,
    streakCombo,
    language,
  } = useChatStore();

  const [drawingOpen, setDrawingOpen] = useState(false);
  const canvasRef = useRef<{ clearCanvas: () => void } | null>(null);
  const pendingChoiceFeedbackRef = useRef(false);
  const prevAssistantCountRef = useRef(0);

  const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
  const questionType = lastAssistant?.metadata?.questionType;
  const { narrative, choices } = parseChoices(lastAssistant?.content ?? '');

  const theme = getTheme(activeQuest?.chapter ?? 'Adventures');
  const showExplainBack = questionType === 'celebrate_then_explain_back';
  const showChoices = choices.length > 0 && !showExplainBack;

  const vidyaState: VidyaState =
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back'
      ? 'celebrating'
      : questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement'
        ? 'puzzled'
        : questionType === 'attempt_prompt' || questionType === 'socratic'
          ? 'talking'
          : 'idle';

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;
    if (pendingChoiceFeedbackRef.current && assistantCount > prevAssistantCountRef.current && lastAssistant) {
      const qt = lastAssistant.metadata?.questionType;
      const correct =
        qt === 'celebration' || qt === 'celebrate_then_explain_back';
      const wrong =
        qt === 'hint_with_question' || qt === 'foundational' || qt === 'encouragement';
      if (correct) setLastChoiceCorrect(true);
      else if (wrong) setLastChoiceCorrect(false);
      pendingChoiceFeedbackRef.current = false;
      prevAssistantCountRef.current = assistantCount;
      const delay = correct ? 1500 : 1000;
      const t = setTimeout(() => setLastChoiceCorrect(null), delay);
      return () => clearTimeout(t);
    }
    prevAssistantCountRef.current = assistantCount;
  }, [messages, lastAssistant, setLastChoiceCorrect]);

  useEffect(() => {
    if (questionType === 'celebrate_then_explain_back') setScenePhase('explain-back');
    else if (questionType === 'celebration') {
      setScenePhase('celebration');
      incrementCombo();
    } else {
      setScenePhase('playing');
      if (questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement') {
        resetCombo();
      }
    }
  }, [questionType, setScenePhase, incrementCombo, resetCombo]);

  useEffect(() => {
    if (!activeQuest) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/game/scene-image`, {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            questTitle: activeQuest.title,
            chapter: activeQuest.chapter,
            tags: activeQuest.tags,
            phase: 'playing',
          }),
        });
        if (cancelled) return;
        const data = await res.json();
        if (data.success && data.imageUrl) setSceneImageUrl(data.imageUrl);
      } catch (_) {
        if (!cancelled) setSceneImageUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeQuest?.id, activeQuest?.title, activeQuest?.chapter, activeQuest?.tags, setSceneImageUrl]);

  const handleChoice = useCallback(
    (text: string) => {
      pendingChoiceFeedbackRef.current = true;
      onSendMessage(text);
      setLastChoiceCorrect(null);
    },
    [onSendMessage, setLastChoiceCorrect]
  );

  const handleVoiceTranscription = useCallback(
    (text: string) => {
      onSendMessage(text);
    },
    [onSendMessage]
  );

  const handleSendDrawing = useCallback(
    (imageData: string) => {
      onSendMessage('Here is my drawing!', imageData);
      canvasRef.current?.clearCanvas?.();
      setDrawingOpen(false);
    },
    [onSendMessage]
  );

  const quickActions = [
    { label: "I'm stuck" },
    { label: 'Help me!' },
    { label: 'Say it differently' },
  ];

  if (!activeQuest) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-slate-500 dark:text-slate-400">Pick a quest to start!</p>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] overflow-hidden" data-testid="quest-scene">
      {/* Scene Banner — capped height, always visible */}
      <div
        className={cn(
          'relative mx-4 mt-4 flex max-h-[20vh] min-h-[100px] flex-col justify-end overflow-hidden rounded-2xl border-2 p-4',
          `bg-gradient-to-br ${theme.bg} ${theme.border}`
        )}
      >
        {(sceneImageUrl || theme.sceneImage) ? (
          <img
            src={sceneImageUrl ?? theme.sceneImage ?? ''}
            alt={activeQuest.title}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-2xl">{theme.emoji}</span>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100" data-testid="scene-title">{activeQuest.title}</h2>
        </div>
        <p className="relative z-10 mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
          {activeQuest.prompt.slice(0, 120)}
          {activeQuest.prompt.length > 120 ? '…' : ''}
        </p>
      </div>

      {/* Dialog + Action Zone — flex-1, scrolls only if needed */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <div
          data-testid="vidya-bubble"
          className={cn(
            'animate-bubble-appear shrink-0 max-w-[90%] self-start rounded-2xl rounded-bl-md border-2 bg-white/95 px-5 py-4 shadow-lg dark:bg-slate-800/95',
            theme.border,
            lastChoiceCorrect === true && 'animate-correct-flash ring-2 ring-emerald-400',
            lastChoiceCorrect === false && 'animate-wrong-shake ring-2 ring-red-300'
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', theme.accent)}>
              <VidyaCharacter state={vidyaState} className="text-white h-10 w-10" />
            </div>
            <div className="flex-1">
              {questionType && (
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {KID_HEADERS[questionType] ?? 'Vidya says…'}
                </div>
              )}
              {isLoading ? (
                <div className="flex gap-1 py-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <p className="text-lg text-slate-800 dark:text-slate-100">{narrative || lastAssistant?.content || '...'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Visual content if present */}
        {lastAssistant?.metadata?.visualContent && !isLoading && (
          <div className="mt-3 rounded-xl border border-slate-200/60 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <WhiteboardContainer content={lastAssistant.metadata.visualContent as any} />
          </div>
        )}

        {/* Action Panel */}
        <div className="mt-4 space-y-3">
          {showChoices && (
            <div className="grid gap-3 sm:grid-cols-3">
              {choices.map((c, i) => {
                const colors = ['bg-blue-500 hover:bg-blue-600', 'bg-green-500 hover:bg-green-600', 'bg-purple-500 hover:bg-purple-600'];
                return (
                  <button
                    key={i}
                    data-testid={`choice-${c.letter}`}
                    onClick={() => handleChoice(c.text)}
                    disabled={isLoading}
                    className={cn(
                      'animate-choice-press flex items-center gap-2 rounded-2xl px-5 py-4 text-left font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50',
                      colors[i % 3]
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">
                      {c.letter}
                    </span>
                    {c.text}
                  </button>
                );
              })}
            </div>
          )}

          {showExplainBack && (
            <div data-testid="explain-back-prompt" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:from-amber-900/30 dark:to-orange-900/30">
              <p className="text-center text-lg font-bold text-slate-800 dark:text-slate-100">Tell Vidya WHY it works!</p>
              <div className="flex gap-3">
                <VoiceButton language={language.toLowerCase()} onTranscription={handleVoiceTranscription} disabled={isLoading} size="large" />
                <button
                  type="button"
                  onClick={() => setDrawingOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
                >
                  <Pencil className="h-5 w-5" />
                  Or draw it!
                </button>
              </div>
            </div>
          )}

          {!showChoices && !showExplainBack && (
            <div className="flex justify-center gap-4">
              <VoiceButton language={language.toLowerCase()} onTranscription={handleVoiceTranscription} disabled={isLoading} size="large" />
              <button
                type="button"
                onClick={() => setDrawingOpen(true)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl px-6 py-4 font-bold transition-all',
                  theme.accent,
                  'text-white hover:opacity-90'
                )}
              >
                <Pencil className="h-6 w-6" />
                Draw it!
              </button>
            </div>
          )}

          {/* Quick actions — hidden during explain-back (it has its own voice/draw UI) */}
          {!showExplainBack && (
            <div className="flex justify-center gap-2">
              {quickActions.map((a, i) => (
              <button
                key={i}
                data-testid="quick-action"
                onClick={() => handleChoice(a.label)}
                disabled={isLoading}
                className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/50"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {streakCombo > 1 && (
              <span data-testid="streak-combo" className="animate-combo-pop inline-block rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-900">
                {streakCombo} in a row!
              </span>
            )}
            <div data-testid="quest-progress" className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((step) => {
                const assistantCount = messages.filter((m) => m.role === 'assistant').length;
                const currentStep = Math.min(assistantCount, 5);
                const filled = step <= currentStep;
                const isCurrent = step === currentStep;
                return (
                  <span
                    key={step}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      filled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600',
                      isCurrent && filled && 'scale-125 animate-pulse'
                    )}
                    aria-hidden
                  />
                );
              })}
            </div>
          </div>

          {/* Draw canvas */}
          {drawingOpen && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
              <div className="mb-2 flex justify-between">
                <span className="text-sm font-semibold">Draw your thinking</span>
                <button onClick={() => setDrawingOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">
                  Close
                </button>
              </div>
              <StudentCanvas ref={canvasRef} isKidMode onSendDrawing={handleSendDrawing} />
            </div>
          )}
        </div>
      </div>

      {/* End Adventure — pinned at bottom, always visible */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/95">
        <button
          data-testid="end-adventure"
          onClick={() => {
            onEndSession();
          }}
          className="w-full rounded-xl bg-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
        >
          End adventure
        </button>
      </div>
    </div>
  );
}
