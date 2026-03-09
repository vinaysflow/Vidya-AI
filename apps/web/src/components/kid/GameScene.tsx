/**
 * GameScene — game-first rendering layer for kid mode quests.
 *
 * Replaces QuestScene. Key differences:
 * - Fixed viewport, no scrolling
 * - SceneCanvas is the visual (no whiteboard/equation steps)
 * - 1-line speech bubble with frontend truncation (safety net for LLM verbosity)
 * - [A]/[B]/[C] choice cards on EVERY turn including explain-back
 * - No voice/draw UI (choices are the only interaction for 3rd graders)
 * - Progress driven by correct-answer count, not total assistant messages
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import { VidyaCharacter, type VidyaState } from './VidyaCharacter';
import { SceneCanvas } from './SceneCanvas';
import { AudioPlayer } from '../voice/AudioPlayer';
import { cn } from '../../lib/utils';
import { getTheme, parseChoices, CHAPTER_THEMES } from './questSceneTheme';
import { useChatStore, type Message } from '../../stores/chatStore';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import { useGameSounds } from './useGameSounds';
import { confettiData, sparkleData } from './lottieData';

// Optional AI-generated scene images — only enabled when VITE_ENABLE_AI_SCENES=true
const AI_SCENES_ENABLED = import.meta.env.VITE_ENABLE_AI_SCENES === 'true';

// Show up to 2 sentences in the speech bubble so the kid sees both
// encouragement ("Great job!") and the follow-up question.
function truncateForBubble(text: string): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length >= 2) {
    // Return last 2 sentences (encouragement + question)
    const last2 = sentences.slice(-2).map((s) => s.trim()).join(' ');
    return last2.length > 220 ? last2.slice(0, 217).trimEnd() + '…' : last2;
  }
  if (sentences && sentences.length === 1) {
    return sentences[0].trim().length > 200
      ? sentences[0].trim().slice(0, 197).trimEnd() + '…'
      : sentences[0].trim();
  }
  // No sentence boundary: cap at 200 chars
  return text.length > 200 ? text.slice(0, 197).trimEnd() + '…' : text;
}

const KID_HEADERS: Record<string, string> = {
  celebration: '🎉 Amazing!',
  celebrate_then_explain_back: '🤖 Teach the robot!',
  socratic: '🤔 Think about this…',
  hint_with_question: "💡 Here's a hint…",
  foundational: "🔍 Let's figure it out!",
  attempt_prompt: '⚡ Your turn!',
  encouragement: '💪 Keep going!',
};

const CHOICE_COLORS = [
  'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
  'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
  'bg-violet-500 hover:bg-violet-600 active:bg-violet-700',
];

type Choice = { letter: string; text: string };

const FALLBACK_CHOICES: Record<string, Choice[]> = {
  celebrate_then_explain_back: [
    { letter: 'A', text: 'I multiplied to get the answer' },
    { letter: 'B', text: 'I added them up one by one' },
    { letter: 'C', text: "I'm not sure why it works" },
  ],
  celebration: [
    { letter: 'A', text: 'I multiplied to get the answer' },
    { letter: 'B', text: 'I added them up one by one' },
    { letter: 'C', text: "I'm not sure why it works" },
  ],
  hint_with_question: [
    { letter: 'A', text: 'Show me the first step' },
    { letter: 'B', text: "Can I try a simpler version?" },
    { letter: 'C', text: "Let me try again!" },
  ],
  foundational: [
    { letter: 'A', text: 'Show me an example' },
    { letter: 'B', text: 'Break it into smaller steps' },
    { letter: 'C', text: 'I want to start over' },
  ],
  encouragement: [
    { letter: 'A', text: "OK let me try again!" },
    { letter: 'B', text: 'I need another hint' },
    { letter: 'C', text: 'Say it differently' },
  ],
  _default: [
    { letter: 'A', text: 'I think I know!' },
    { letter: 'B', text: 'I need a hint' },
    { letter: 'C', text: 'Can you say it differently?' },
  ],
};

function getFallbackChoices(questionType: string | undefined): Choice[] {
  if (!questionType) return FALLBACK_CHOICES._default;
  return FALLBACK_CHOICES[questionType] ?? FALLBACK_CHOICES._default;
}

interface GameSceneProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onEndSession: () => void;
}

export function GameScene({ messages, isLoading, onSendMessage, onEndSession }: GameSceneProps) {
  const {
    activeQuest,
    setScenePhase,
    lastChoiceCorrect,
    setLastChoiceCorrect,
    incrementCombo,
    resetCombo,
    streakCombo,
    clearChat,
    userId,
    fetchProfileAndMastery,
    effectiveGrade,
    grade,
    voiceEnabled,
    language,
    subject,
    apiKey,
    lastParentInsight,
    pendingWarmUp,
    calmMode,
  } = useChatStore();

  const { play: playSound } = useGameSounds();
  const pendingChoiceFeedbackRef = useRef(false);
  const prevAssistantCountRef = useRef(0);
  const [choiceAnimKey, setChoiceAnimKey] = useState(0);
  // Duolingo-style feedback: which choice letter was clicked + XP pop state
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [showXpPop, setShowXpPop] = useState(false);
  // Adaptive level-up celebration
  const [showAdaptiveLevelUp, setShowAdaptiveLevelUp] = useState(false);
  const [newChallengeLevel, setNewChallengeLevel] = useState(1);
  const prevEffectiveGradeRef = useRef(effectiveGrade);
  // Optional AI scene image overlay
  const [aiSceneUrl, setAiSceneUrl] = useState<string | null>(null);
  // My Progress overlay
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [progressSummary, setProgressSummary] = useState<{
    conceptsMastered: number;
    conceptsAttempted: number;
    strongestTopic: string | null;
    gradeLevelsUp: number;
  } | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // TTS state for speech bubble
  const [bubbleAudioUrl, setBubbleAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());

  const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
  const questionType = lastAssistant?.metadata?.questionType as string | undefined;
  const { narrative, choices: parsedChoices } = parseChoices(lastAssistant?.content ?? '');
  const choices = parsedChoices.length > 0 ? parsedChoices : (lastAssistant ? getFallbackChoices(questionType) : []);

  // Detect hint loop: 3+ consecutive assistant messages that are hint/foundational with no parsed choices
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const recentAssistants = assistantMessages.slice(-3);
  const isStuckInLoop = recentAssistants.length >= 3 && recentAssistants.every((m) => {
    const qt = m.metadata?.questionType as string | undefined;
    return (qt === 'hint_with_question' || qt === 'foundational') &&
      parseChoices(m.content ?? '').choices.length === 0;
  });

  // Show up to 2 sentences in the speech bubble.
  // If the LLM just parrots the quest prompt, suppress it to avoid repeating the prompt bar.
  const rawBubble = narrative || lastAssistant?.content || '';
  const questPrompt = activeQuest?.prompt ?? '';
  const isSameAsPrompt = questPrompt.length > 0 &&
    rawBubble.replace(/\s+/g, ' ').trim().toLowerCase().includes(
      questPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60)
    );
  const displayText = isSameAsPrompt
    ? truncateForBubble(rawBubble.replace(questPrompt, '').trim() || 'Pick the right answer!')
    : truncateForBubble(rawBubble);

  // TTS: synthesize speech bubble text
  const synthesizeBubble = useCallback(async (text: string) => {
    if (!text || !voiceEnabled) return;
    const cacheKey = text.slice(0, 100);
    const cached = ttsCacheRef.current.get(cacheKey);
    if (cached) { setBubbleAudioUrl(cached); return; }

    setTtsLoading(true);
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/api/voice/synthesize`, {
        method: 'POST',
        headers: getJsonHeaders(apiKey),
        body: JSON.stringify({ text: text.slice(0, 4000), language, subject }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        ttsCacheRef.current.set(cacheKey, url);
        setBubbleAudioUrl(url);
      }
    } catch (_) {}
    finally { setTtsLoading(false); }
  }, [voiceEnabled, language, subject, apiKey]);

  useEffect(() => {
    if (displayText && voiceEnabled) {
      synthesizeBubble(displayText);
    } else {
      setBubbleAudioUrl(null);
    }
  }, [displayText]); // intentionally only depend on displayText

  const theme = getTheme(activeQuest?.chapter ?? 'Adventures');

  // Progress = correct answers / dynamic total based on quest grade level
  const gradeForSteps = activeQuest?.gradeLevel ?? 3;
  const questTotalSteps = gradeForSteps <= 3 ? 4 : gradeForSteps <= 5 ? 5 : 6;
  const correctAnswers = messages.filter(
    (m) => m.role === 'assistant' &&
    (m.metadata?.questionType === 'celebration' || m.metadata?.questionType === 'celebrate_then_explain_back')
  ).length;
  const progress = Math.min(correctAnswers / questTotalSteps, 1);

  // Detect quest complete: final celebration after explain-back
  const assistantMsgs = messages.filter((m) => m.role === 'assistant');
  const lastAsstMsg = assistantMsgs[assistantMsgs.length - 1];
  const prevAsstMsg = assistantMsgs[assistantMsgs.length - 2];
  const isQuestComplete =
    lastAsstMsg?.metadata?.questionType === 'celebration' &&
    prevAsstMsg?.metadata?.questionType === 'celebrate_then_explain_back';

  // lastResult for SceneCanvas animation
  const lastResult: 'correct' | 'wrong' | null =
    lastChoiceCorrect === true ? 'correct' :
    lastChoiceCorrect === false ? 'wrong' : null;

  // VidyaCharacter state
  const vidyaState: VidyaState =
    isLoading ? 'thinking' :
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back' ? 'celebrating' :
    questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement' ? 'puzzled' :
    questionType === 'attempt_prompt' || questionType === 'socratic' ? 'talking' : 'idle';

  // Track correct/wrong feedback when assistant responds
  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;
    if (pendingChoiceFeedbackRef.current && assistantCount > prevAssistantCountRef.current && lastAssistant) {
      const qt = lastAssistant.metadata?.questionType;
      const correct = qt === 'celebration' || qt === 'celebrate_then_explain_back';
      const wrong = qt === 'hint_with_question' || qt === 'foundational' || qt === 'encouragement';
      if (correct) {
        setLastChoiceCorrect(true);
        playSound('correct');
        setShowXpPop(true);
        setTimeout(() => setShowXpPop(false), 1100);
      } else if (wrong) {
        setLastChoiceCorrect(false);
        playSound('wrong');
      }
      pendingChoiceFeedbackRef.current = false;
      prevAssistantCountRef.current = assistantCount;
      const delay = correct ? 1200 : 800;
      const t = setTimeout(() => {
        setLastChoiceCorrect(null);
        setClickedLetter(null);
      }, delay);
      return () => clearTimeout(t);
    }
    prevAssistantCountRef.current = assistantCount;
  }, [messages, lastAssistant, setLastChoiceCorrect]);

  // Scene phase tracking
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

  // Quest complete sound
  useEffect(() => {
    if (isQuestComplete) playSound('complete');
  }, [isQuestComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect adaptive grade level-up
  useEffect(() => {
    const prev = prevEffectiveGradeRef.current;
    if (prev !== null && effectiveGrade !== null && effectiveGrade > (prev ?? 0)) {
      setNewChallengeLevel(effectiveGrade - (grade ?? 3) + 1);
      setShowAdaptiveLevelUp(true);
      playSound('levelUp');
    }
    prevEffectiveGradeRef.current = effectiveGrade;
  }, [effectiveGrade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quest intro overlay state
  const [showQuestIntro, setShowQuestIntro] = useState(true);

  useEffect(() => {
    if (!activeQuest) return;
    setShowQuestIntro(true);
    playSound('questStart');
    const t = setTimeout(() => setShowQuestIntro(false), 1500);
    return () => clearTimeout(t);
  }, [activeQuest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional: fetch AI-generated scene image when quest starts (gated by env flag)
  useEffect(() => {
    if (!AI_SCENES_ENABLED || !activeQuest) return;
    setAiSceneUrl(null);
    const params = new URLSearchParams({
      questTitle: activeQuest.title,
      chapter: activeQuest.chapter,
      tags: (activeQuest.tags ?? []).join(','),
      phase: 'playing',
    });
    fetch(`/api/game/scene-image?${params}`)
      .then((r) => r.json())
      .then((data: { imageUrl?: string | null }) => {
        if (data?.imageUrl) setAiSceneUrl(data.imageUrl);
      })
      .catch(() => { /* silently fall back to SVG scene */ });
  }, [activeQuest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoice = useCallback(
    (text: string, letter?: string) => {
      playSound('tap');
      pendingChoiceFeedbackRef.current = true;
      setLastChoiceCorrect(null);
      setClickedLetter(letter ?? null);
      setChoiceAnimKey((k) => k + 1);
      onSendMessage(text);
    },
    [onSendMessage, setLastChoiceCorrect, playSound]
  );

  const quickActions = [
    { label: "I'm stuck" },
    { label: 'Help me!' },
    { label: 'Say it differently' },
  ];

  const handleNextAdventure = useCallback(() => {
    clearChat();
    if (userId && userId !== 'anonymous') fetchProfileAndMastery(userId);
  }, [clearChat, userId, fetchProfileAndMastery]);

  const handleShowProgress = useCallback(async () => {
    setShowProgressOverlay(true);
    if (userId && userId !== 'anonymous' && !progressSummary) {
      setProgressLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
        const res = await fetch(`${API_BASE}/api/progress/summary?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json() as { success: boolean; summary: typeof progressSummary };
          if (data.success && data.summary) setProgressSummary(data.summary);
        }
      } catch (_) { /* non-critical */ } finally {
        setProgressLoading(false);
      }
    }
  }, [userId, progressSummary]);

  if (!activeQuest) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Pick a quest to start!</p>
      </div>
    );
  }

  if (isQuestComplete) {
    return (
      <div
        data-testid="game-scene"
        className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6"
        style={{ maxHeight: '100dvh' }}
      >
        {/* Full-screen confetti burst — skipped in calm mode */}
        {!calmMode && (
          <Lottie
            animationData={confettiData}
            loop={false}
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            aria-hidden="true"
          />
        )}

        <div className="shrink-0 px-3 pt-3 w-full max-w-md">
          <SceneCanvas
            chapter={activeQuest.chapter}
            progress={1}
            lastResult="correct"
          />
        </div>

        <div className="flex flex-col items-center gap-4 pt-6 animate-[starAppear_0.5s_ease-out]">
          <div className="text-5xl">&#127942;</div>
          <h2 className="font-fredoka text-3xl text-amber-500 dark:text-amber-400">
            Quest Complete!
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-300 text-sm max-w-xs">
            You crushed it! Ready for the next challenge?
          </p>
          {streakCombo > 0 && (
            <div className="flex items-center gap-1 text-orange-500 font-bold text-lg">
              <span>&#128293;</span> {streakCombo} streak!
            </div>
          )}

          {/* Parent insight card — gives child language to share with parent */}
          {lastParentInsight && (
            <div className="w-full max-w-xs rounded-2xl bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 px-4 py-3">
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">
                Tell your parent! &#128172;
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                {lastParentInsight}
              </p>
            </div>
          )}

          <button
            data-testid="next-adventure"
            onClick={handleNextAdventure}
            className="mt-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all shadow-lg"
          >
            Next Adventure!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="game-scene"
      className="relative flex h-full flex-col overflow-hidden"
      style={{ maxHeight: '100dvh' }}
    >
      {/* Quest Accepted overlay — shows for 1.5s on quest start, skipped in calm mode */}
      {showQuestIntro && !calmMode && (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 animate-[fadeIn_0.2s_ease-out]">
          <div className="animate-[comboPop_0.4s_ease-out] text-center px-6">
            <div className="text-5xl mb-3">{CHAPTER_THEMES[activeQuest.chapter]?.emoji ?? '✨'}</div>
            <div className="text-lg font-bold text-white/80 mb-1">Quest Accepted!</div>
            <div className="text-2xl font-bold text-amber-300">{activeQuest.title}</div>
          </div>
        </div>
      )}

      {/* ── 1. Scene Canvas (40% of viewport) ─────────────────────────────── */}
      <div className="relative shrink-0 px-3 pt-3">
        {/* AI-generated background image (opt-in via VITE_ENABLE_AI_SCENES=true) */}
        {aiSceneUrl && (
          <img
            src={aiSceneUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 top-3 rounded-2xl object-cover opacity-30"
          />
        )}
        <SceneCanvas
          chapter={activeQuest.chapter}
          progress={progress}
          lastResult={lastResult}
        />
      </div>

      {/* ── 2a. Reading Context (shown when quest has supplementary material) ── */}
      {activeQuest.context && (
        <div className="shrink-0 px-3 pt-2">
          <div
            data-testid="quest-context"
            className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/50 px-4 py-2 max-h-28 overflow-y-auto"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-0.5">
              &#128214; Read this first
            </p>
            <p className="text-sm leading-snug text-indigo-900 dark:text-indigo-200">
              {activeQuest.context}
            </p>
          </div>
        </div>
      )}

      {/* ── 2b. Persistent Quest Prompt ────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-2">
        <div
          data-testid="quest-prompt"
          className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 px-4 py-2"
        >
          <p className="text-sm font-medium leading-snug text-amber-900 dark:text-amber-200">
            <span className="mr-1.5">&#128218;</span>
            {activeQuest.prompt}
          </p>
        </div>
      </div>

      {/* ── 2b. Speech Bubble (Vidya's latest response) ───────────────── */}
      <div className="relative shrink-0 px-3 pt-2">
        {/* Sparkle animation overlaying the bubble on correct answer */}
        {lastChoiceCorrect === true && (
          <Lottie
            key={`sparkle-${choiceAnimKey}`}
            animationData={sparkleData}
            loop={false}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden="true"
          />
        )}
        <div
          data-testid="vidya-bubble"
          className={cn(
            'flex items-start gap-3 rounded-2xl border-2 bg-white/95 px-4 py-3 shadow-lg dark:bg-slate-800/95',
            theme.border,
            lastChoiceCorrect === true && 'ring-2 ring-emerald-400 animate-[correctFlash_0.5s_ease-out]',
            lastChoiceCorrect === false && 'animate-[wrongShake_0.4s_ease-out] ring-2 ring-red-300'
          )}
        >
          {/* Vidya avatar */}
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', theme.accent)}>
            <VidyaCharacter state={vidyaState} className="text-white h-8 w-8" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Warm-up badge — shown on the first turn when a warm-up problem was served */}
            {pendingWarmUp && messages.filter((m) => m.role === 'assistant').length <= 1 && (
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-800/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                <span>✦</span> Warm-up!
              </div>
            )}
            {questionType && (
              <div className="mb-0.5 font-fredoka text-sm tracking-wide text-amber-600 dark:text-amber-400">
                {KID_HEADERS[questionType] ?? 'Vidya says…'}
              </div>
            )}
            {isLoading ? (
              <div className="flex gap-1 py-1">
                <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <p className="text-base font-medium leading-snug text-slate-800 dark:text-slate-100">
                {displayText || '…'}
              </p>
            )}
            {bubbleAudioUrl && !isLoading && (
              <div className="mt-1">
                <AudioPlayer audioUrl={bubbleAudioUrl} autoPlay={true} />
              </div>
            )}
            {ttsLoading && !isLoading && (
              <div className="mt-1 text-xs text-slate-400">Reading aloud...</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Loop escape hatch ─────────────────────────────────────────── */}
      {isStuckInLoop && (
        <div className="mx-3 mt-2 rounded-xl bg-red-50 p-3 text-center dark:bg-red-900/30">
          <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
            Looks like we&apos;re going in circles! Let&apos;s try something new.
          </p>
          <button
            onClick={onEndSession}
            className="rounded-xl bg-red-500 px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-red-600 active:scale-95"
          >
            Pick a different quest
          </button>
        </div>
      )}

      {/* ── 3. Choice Cards (always shown, including explain-back) ─────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3">
        {choices.length > 0 && !isLoading ? (
          <div
            key={choiceAnimKey}
            className={cn(
              'grid gap-2',
              choices.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
            )}
          >
            {choices.map((c, i) => {
              const wasClicked = clickedLetter === c.letter;
              const flashClass = wasClicked
                ? lastChoiceCorrect === true
                  ? 'animate-btn-correct'
                  : lastChoiceCorrect === false
                  ? 'animate-btn-wrong'
                  : ''
                : '';
              return (
                <div key={i} className="relative">
                  <button
                    data-testid={`choice-${c.letter}`}
                    aria-label={`Choice ${c.letter}: ${c.text}`}
                    onClick={() => handleChoice(c.text, c.letter)}
                    disabled={isLoading}
                    className={cn(
                      'group relative overflow-hidden w-full flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-1 rounded-2xl px-4 py-3 sm:py-4 text-left sm:text-center font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-40',
                      CHOICE_COLORS[i % 3],
                      'animate-[bubbleAppear_0.2s_ease-out]',
                      flashClass
                    )}
                    style={{ animationDelay: `${i * 60}ms`, minHeight: 56 }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-fredoka">
                      {c.letter}
                    </span>
                    <span className="text-sm leading-tight">{c.text}</span>
                    {wasClicked && lastChoiceCorrect === true && (
                      <span className="relative inline-flex items-center gap-1">
                        <span>✓</span>
                        <span className="animate-[starBurst_0.5s_ease-out_both] absolute -top-1 -right-1 text-yellow-400 text-xs pointer-events-none">★</span>
                      </span>
                    )}
                    {/* Shimmer on hover */}
                    <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </span>
                  </button>
                  {/* Floating +XP badge on the correct button */}
                  {wasClicked && showXpPop && (
                    <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 animate-xp-pop">
                      <span className="font-fredoka text-sm text-emerald-500 drop-shadow font-bold">+10 XP</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !isLoading && choices.length === 0 ? (
          /* No choices from LLM — show quick actions prominently as fallback */
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {quickActions.map((a, i) => (
              <button
                key={i}
                data-testid="quick-action"
                aria-label={a.label}
                onClick={() => handleChoice(a.label)}
                disabled={isLoading}
                className="rounded-2xl bg-amber-100 px-5 py-3 text-sm font-bold text-amber-800 transition-all hover:bg-amber-200 active:scale-95 dark:bg-amber-900/40 dark:text-amber-300"
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Quick actions — always visible below choices */}
        {choices.length > 0 && !isLoading && (
          <div className="mt-2 flex justify-center gap-2">
            {quickActions.map((a, i) => (
              <button
                key={i}
                data-testid="quick-action"
                aria-label={a.label}
                onClick={() => handleChoice(a.label)}
                disabled={isLoading}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-700 dark:text-slate-300"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Progress + End ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-200/60 bg-white/90 px-4 py-2 dark:border-slate-700/60 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          {/* Animated progress ring */}
          <div data-testid="quest-progress" className="flex items-center gap-2">
            {(() => {
              const totalSteps = questTotalSteps;
              const stepCount = correctAnswers;
              const size = 64;
              const strokeW = 6;
              const r = (size - strokeW) / 2;
              const circ = 2 * Math.PI * r;
              const progressFrac = totalSteps > 0 ? (stepCount / totalSteps) : 0;
              const offset = circ * (1 - progressFrac);
              return (
                <div className="flex flex-col items-center gap-1">
                  <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} />
                    <circle
                      cx={size/2} cy={size/2} r={r}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <span className="text-xs text-slate-400 font-semibold -mt-1">{stepCount}/{totalSteps}</span>
                </div>
              );
            })()}
            {streakCombo > 1 && (
              <span
                data-testid="streak-combo"
                className="ml-2 animate-[comboPop_0.3s_ease-out] rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900"
              >
                {streakCombo}🔥
              </span>
            )}
            {/* Difficulty stars — shown when above base grade */}
            {(() => {
              const boost = Math.max(0, (effectiveGrade ?? grade ?? 3) - (grade ?? 3));
              if (boost === 0) return null;
              return (
                <div className="flex items-center gap-0.5 ml-2" data-testid="difficulty-stars">
                  {Array.from({ length: boost + 1 }, (_, i) => (
                    <span key={i} className="text-amber-400 text-xs leading-none">★</span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* My Progress button */}
          <button
            data-testid="my-progress"
            onClick={handleShowProgress}
            className="rounded-lg bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
          >
            My Progress
          </button>

          {/* End adventure */}
          <button
            data-testid="end-adventure"
            onClick={onEndSession}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
          >
            End adventure
          </button>
        </div>
      </div>

      {/* My Progress overlay */}
      {showProgressOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowProgressOverlay(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4 animate-[comboPop_0.4s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">⭐</div>
            <h2 className="font-bold text-2xl text-amber-600 dark:text-amber-400 mb-4">
              My Progress
            </h2>
            {progressLoading ? (
              <div className="flex justify-center py-4">
                <span className="h-3 w-3 animate-bounce rounded-full bg-amber-400 mr-1" style={{ animationDelay: '0ms' }} />
                <span className="h-3 w-3 animate-bounce rounded-full bg-amber-400 mr-1" style={{ animationDelay: '150ms' }} />
                <span className="h-3 w-3 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '300ms' }} />
              </div>
            ) : progressSummary ? (
              <div className="space-y-3 text-left text-sm">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {progressSummary.conceptsMastered} of {progressSummary.conceptsAttempted}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300"> concepts mastered!</span>
                </div>
                {progressSummary.strongestTopic && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
                    <span className="text-slate-600 dark:text-slate-300">Strongest area: </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {progressSummary.strongestTopic.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                <div className="rounded-xl bg-sky-50 dark:bg-sky-900/30 px-4 py-3">
                  <span className="text-slate-600 dark:text-slate-300">Challenge level: </span>
                  <span className="font-bold text-sky-700 dark:text-sky-300">
                    {progressSummary.gradeLevelsUp > 0
                      ? `${progressSummary.gradeLevelsUp} above your grade!`
                      : 'right at your grade — keep going!'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                Keep adventuring to see your stats here!
              </p>
            )}
            <button
              onClick={() => setShowProgressOverlay(false)}
              className="mt-5 bg-amber-500 text-white rounded-2xl px-6 py-2 font-bold text-sm hover:bg-amber-600 transition-colors"
            >
              Keep Adventuring!
            </button>
          </div>
        </div>
      )}

      {/* Adaptive level-up celebration modal */}
      {showAdaptiveLevelUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAdaptiveLevelUp(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4 animate-[comboPop_0.4s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-3">🌟</div>
            <h2 className="font-bold text-2xl text-amber-600 mb-2">
              Challenge Level {newChallengeLevel} Unlocked!
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              You're solving these so fast — harder adventures await!
            </p>
            <button
              onClick={() => setShowAdaptiveLevelUp(false)}
              className="bg-amber-500 text-white rounded-2xl px-6 py-2 font-bold text-sm hover:bg-amber-600 transition-colors"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scene Preview (Gate 2 helper) ─────────────────────────────────────────

/**
 * Rendered at ?scene-preview=1 in development to visually verify SceneCanvas
 * before wiring into the full app.
 */
export function ScenePreview() {
  const chapters = ['Minecraft Builder', 'Kitchen Scientist', 'Playground Lab', 'Pattern Detective', 'Nature Explorer'];
  const progresses = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">SceneCanvas Preview</h1>
      {chapters.map((chapter) => (
        <div key={chapter} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-amber-400">{chapter}</h2>
          <div className="grid grid-cols-3 gap-4">
            {progresses.slice(0, 3).map((p) => (
              <div key={p}>
                <p className="mb-1 text-xs text-slate-400">progress={p}</p>
                <SceneCanvas chapter={chapter} progress={p} lastResult={null} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
