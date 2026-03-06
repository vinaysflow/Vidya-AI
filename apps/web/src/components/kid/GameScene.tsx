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
import { cn } from '../../lib/utils';
import { getTheme, parseChoices, CHAPTER_THEMES } from './questSceneTheme';
import { useChatStore, type Message } from '../../stores/chatStore';
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
    { letter: 'A', text: 'Yes, I think so!' },
    { letter: 'B', text: "No, I'm confused" },
    { letter: 'C', text: 'Can you explain more?' },
  ],
  foundational: [
    { letter: 'A', text: 'Yes, I think so!' },
    { letter: 'B', text: "No, I'm confused" },
    { letter: 'C', text: 'Can you explain more?' },
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

  const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
  const questionType = lastAssistant?.metadata?.questionType as string | undefined;
  const { narrative, choices: parsedChoices } = parseChoices(lastAssistant?.content ?? '');
  const choices = parsedChoices.length > 0 ? parsedChoices : (lastAssistant ? getFallbackChoices(questionType) : []);

  // Show up to 2 sentences in the speech bubble
  const displayText = truncateForBubble(narrative || lastAssistant?.content || '');

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
        {/* Full-screen confetti burst — pointer-events-none so button stays clickable */}
        <Lottie
          animationData={confettiData}
          loop={false}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          aria-hidden="true"
        />

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
      {/* Quest Accepted overlay — shows for 1.5s on quest start */}
      {showQuestIntro && (
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

      {/* ── 2a. Persistent Quest Prompt ────────────────────────────────── */}
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
          </div>
        </div>
      </div>

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
