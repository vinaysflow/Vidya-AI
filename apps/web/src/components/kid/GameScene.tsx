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

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import { Volume2 } from 'lucide-react';
import { VidyaCharacter, type VidyaState } from './VidyaCharacter';
import { Companion, type CompanionMood } from './Companion';
import { SceneHero } from './SceneHero';
import { SceneCanvas } from './SceneCanvas';
import { cn } from '../../lib/utils';
import { getTheme, parseChoices, CHAPTER_THEMES } from './questSceneTheme';
import { useChatStore, type Message } from '../../stores/chatStore';
import { getApiBase, getJsonHeaders } from '../../lib/api';
import { useGameSounds } from './useGameSounds';
import { confettiData } from './lottieData';
import { TransitionCard } from './TransitionCard';
import { getTransitionMessage } from './getTransitionMessage';
import { NarrativeExit } from './NarrativeExit';
import { useVidyaVoice } from '../../hooks/useVidyaVoice';
import type { VoicePlayOptions } from '../../hooks/useVidyaVoice';
import { InteractionRenderer } from '../../interactions/registry';
import { synthesizeInteraction } from '../../interactions/synthesize';
import type { InteractionResult } from '../../interactions/types';
import { colorOf } from '../../interactions/colorTokens';

// Optional AI-generated scene images — only enabled when VITE_ENABLE_AI_SCENES=true
const AI_SCENES_ENABLED = import.meta.env.VITE_ENABLE_AI_SCENES === 'true';

// The RM hero art — background removed + tightly cropped (true transparent PNG).
const BUDDY_AVATAR_SRC = '/proto/rm-hero-cut.png';

// Show up to 2 sentences in the speech bubble so the kid sees the full response
// and the follow-up question.
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

function significantWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3)
  );
}

// Fraction of the bubble's significant words that also appear in the prompt.
// Used to detect when the buddy is just re-reading the problem.
function promptOverlap(bubble: string, prompt: string): number {
  const b = significantWords(bubble);
  if (b.size === 0) return 0;
  const p = significantWords(prompt);
  let shared = 0;
  b.forEach((w) => { if (p.has(w)) shared++; });
  return shared / b.size;
}

function lastSentence(text: string): string {
  const s = text.match(/[^.!?]+[.!?]+/g);
  return s && s.length > 0 ? s[s.length - 1].trim() : text.trim();
}

// Collapse consecutive duplicate sentences ("How many in all? How many in all?")
// — the LLM occasionally repeats its question verbatim, which reads as a glitch.
function dedupeSentences(text: string): string {
  if (!text) return '';
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts || parts.length < 2) return text;
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const p of parts) {
    const key = p.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(p.trim());
  }
  return kept.join(' ');
}

// Kid-facing habits of mind ("Thinking Powers") — collected as the child learns.
const KID_HABIT_META: Record<string, { label: string; emoji: string }> = {
  persistence: { label: 'Never Gives Up', emoji: '🧗' },
  patternSeeking: { label: 'Pattern Spotter', emoji: '🔍' },
  precision: { label: 'Careful Thinker', emoji: '🎯' },
  selfCorrection: { label: 'Fixes Mistakes', emoji: '🔁' },
  explanation: { label: 'Great Explainer', emoji: '🗣️' },
};
const KID_HABIT_ORDER = ['persistence', 'patternSeeking', 'precision', 'selfCorrection', 'explanation'];

const KID_HEADERS: Record<string, string> = {
  celebration: 'Got it.',
  celebrate_then_explain_back: 'Walk me through it.',
  socratic: 'Think about this…',
  hint_with_question: 'Think about this…',
  foundational: "Let's figure it out.",
  attempt_prompt: 'Your turn.',
  encouragement: 'Keep going.',
};

// Maps quest chapter names to narrativeExits theme keys.
const CHAPTER_TO_NARRATIVE_THEME: Record<string, string> = {
  'Minecraft Builder': 'gaming',
  'Space Explorer': 'space',
  'Kitchen Scientist': 'cooking',
  'Nature Explorer': 'animals',
  'Sports Analyst': 'sports',
  'Robot Engineer': 'robots',
  'Money Matters': 'money',
  'YouTube Creator': 'youtube',
};

// Edgy, high-energy gradients for the answer cards (cycled by index).
const CHOICE_COLORS = [
  'from-emerald-400 to-teal-600 shadow-emerald-500/40 border-emerald-700',
  'from-violet-500 to-fuchsia-600 shadow-fuchsia-500/40 border-fuchsia-800',
  'from-sky-400 to-blue-600 shadow-blue-500/40 border-blue-800',
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

interface TurnSignals {
  representation?: 'manipulative' | 'visual' | 'symbolic' | 'story';
  activeTemplateId?: string;
  pickedDistractorIndex?: number;
  responseTimeMs?: number;
}

interface GameSceneProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, image?: string, signals?: TurnSignals) => void;
  onEndSession: () => void;
}

export function GameScene({ messages, isLoading, onSendMessage, onEndSession }: GameSceneProps) {
  const {
    activeQuest,
    setScenePhase,
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
  const [choiceAnimKey, setChoiceAnimKey] = useState(0);
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
  // Learner model: habits-of-mind ("thinking powers") + buddy growth projection.
  const [habits, setHabits] = useState<Record<string, { score: number; trend: 'up' | 'flat' | 'down' }> | null>(null);
  const [buddy, setBuddy] = useState<{ level: number; callback: string | null; taughtCount: number } | null>(null);
  // NarrativeExit: shown when student taps "End adventure" instead of jumping straight out
  const [showNarrativeExit, setShowNarrativeExit] = useState(false);
  // Live feedback loop: a transient correct/wrong pulse that drives the reactive
  // SceneCanvas (block slam, character jump, screen flash) + the reward sound +
  // a streak/combo so every answer FEELS like it moved the game forward.
  const [sceneResult, setSceneResult] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [rewardBurst, setRewardBurst] = useState<{ key: number; combo: number } | null>(null);
  const lastTurnIdRef = useRef<string | null>(null);
  // Floating "+XP" chips that fly off on a correct answer.
  const [xpFloats, setXpFloats] = useState<Array<{ key: number; amount: number }>>([]);
  // Buddy level-up moment (the meta-progression reward between adventures).
  const [companionLevelUp, setCompanionLevelUp] = useState<number | null>(null);
  const prevBuddyLevelRef = useRef<number | null>(null);

  // Voice hook -- replaces inline TTS state/callbacks
  const { play: playVoice, stop: stopVoice, isPlaying: voiceIsPlaying, isLoading: voiceIsLoading } = useVidyaVoice();
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);

  const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
  const questionType = lastAssistant?.metadata?.questionType as string | undefined;
  const { narrative, choices: parsedChoices } = parseChoices(lastAssistant?.content ?? '');
  const choices = parsedChoices.length > 0 ? parsedChoices : (lastAssistant ? getFallbackChoices(questionType) : []);

  // ── Game-based learning: turn the word problem into a playable manipulative.
  // When the quest prompt matches a known shape (e.g. equal-groups), we render
  // the interaction instead of lettered cards. Otherwise `spec` is null and the
  // choice cards remain the fallback — nothing breaks.
  const interactiveSpec = useMemo(
    () =>
      activeQuest?.prompt
        ? synthesizeInteraction(activeQuest.prompt, { subject, id: activeQuest.id })
        : null,
    [activeQuest?.prompt, activeQuest?.id, subject]
  );
  // Only present the manipulative on "your turn"-type phases (not celebration /
  // explain-back), and not again once the child has built it this quest.
  const ATTEMPT_QUESTION_TYPES = ['attempt_prompt', 'socratic', 'foundational', 'hint_with_question', 'encouragement'];
  const solvedSpecRef = useRef<Set<string>>(new Set());
  const showInteraction =
    !!interactiveSpec &&
    !isLoading &&
    !solvedSpecRef.current.has(interactiveSpec.id) &&
    (questionType === undefined || ATTEMPT_QUESTION_TYPES.includes(questionType));

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
  const rawBubble = dedupeSentences(narrative || lastAssistant?.content || '');
  const questPrompt = activeQuest?.prompt ?? '';
  const isSameAsPrompt = questPrompt.length > 0 &&
    rawBubble.replace(/\s+/g, ' ').trim().toLowerCase().includes(
      questPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60)
    );
  // Detect a paraphrase re-read: the bubble heavily overlaps the prompt without
  // being an exact copy. In that case show only the buddy's actual question
  // (last sentence) so the kid isn't reading the same problem twice.
  const isParaphraseOfPrompt =
    !isSameAsPrompt && questPrompt.length > 0 && rawBubble.length > 80 &&
    promptOverlap(rawBubble, questPrompt) > 0.5;
  const displayText = isSameAsPrompt
    ? truncateForBubble(rawBubble.replace(questPrompt, '').trim() || 'Pick the right answer!')
    : isParaphraseOfPrompt
    ? truncateForBubble(lastSentence(rawBubble))
    : truncateForBubble(rawBubble);

  // Derive tone from game state for emotionally intelligent voice
  const voiceTone: VoicePlayOptions['tone'] =
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back' ? 'celebratory' :
    questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement' ? 'patient' :
    'supportive';

  // Full text for TTS — never truncated so the voice doesn't cut off mid-sentence.
  // Visual bubble uses truncated `displayText`; voice uses the complete content.
  const fullVoiceText = isSameAsPrompt
    ? rawBubble.replace(questPrompt, '').trim()
    : rawBubble;

  // TTS: read the quest prompt aloud on quest start, then full speech bubble on subsequent turns
  const questPromptReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!voiceEnabled) { stopVoice(); return; }
    // On quest start (or quest change), read the actual question prompt first
    if (activeQuest?.prompt && questPromptReadRef.current !== activeQuest.prompt) {
      questPromptReadRef.current = activeQuest.prompt;
      playVoice(activeQuest.prompt, { tone: 'supportive', speed: calmMode ? 0.8 : 0.85, calmMode: calmMode ?? false, language, subject });
      return;
    }
    // On subsequent turns, read the FULL response (not the truncated display text)
    if (fullVoiceText) {
      playVoice(fullVoiceText, { tone: voiceTone, speed: calmMode ? 0.8 : 0.9, calmMode: calmMode ?? false, language, subject });
    }
  }, [fullVoiceText, voiceEnabled, activeQuest?.prompt]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // VidyaCharacter state
  const vidyaState: VidyaState =
    isLoading ? 'thinking' :
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back' ? 'celebrating' :
    questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement' ? 'puzzled' :
    questionType === 'attempt_prompt' || questionType === 'socratic' ? 'talking' : 'idle';

  // Companion mood — prefers the live answer pulse, then the turn type.
  const companionMood: CompanionMood =
    sceneResult === 'correct' ? 'happy' :
    sceneResult === 'wrong' ? 'oops' :
    isLoading ? 'think' :
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back' ? 'happy' :
    questionType === 'hint_with_question' || questionType === 'foundational' ? 'think' :
    questionType === 'attempt_prompt' || questionType === 'socratic' ? 'talk' : 'idle';
  const companionLevel = buddy?.level ?? 1;

  // Scene phase tracking
  useEffect(() => {
    if (questionType === 'celebrate_then_explain_back') setScenePhase('explain-back');
    else if (questionType === 'celebration') {
      setScenePhase('celebration');
    } else {
      setScenePhase('playing');
    }
  }, [questionType, setScenePhase]);

  // Transition warning card: show before each meaningful phase change
  useEffect(() => {
    if (!questionType) return;
    const msg = getTransitionMessage(questionType, activeQuest);
    if (msg) {
      setTransitionMessage(msg);
      if (voiceEnabled) {
        playVoice(msg, { tone: 'supportive', speed: 0.9, calmMode: calmMode ?? false, language, subject });
      }
      const timer = setTimeout(() => setTransitionMessage(null), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [questionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quest complete sound
  useEffect(() => {
    if (isQuestComplete) playSound('complete');
  }, [isQuestComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live feedback loop ──────────────────────────────────────────────────
  // On every NEW assistant turn, classify the result and drive the reactive
  // scene + reward sound + streak. This reconnects the SceneCanvas juice
  // (block slam / jump / flash) and the correct/wrong sounds, which were
  // previously built but never wired to the answer loop.
  const hasUserAttempted = messages.some((m) => m.role === 'user');
  useEffect(() => {
    if (isLoading || !lastAssistant) return;
    if (lastTurnIdRef.current === lastAssistant.id) return;
    const isFirstTurn = lastTurnIdRef.current === null;
    lastTurnIdRef.current = lastAssistant.id ?? null;

    const qt = lastAssistant.metadata?.questionType as string | undefined;
    const isCorrect = qt === 'celebration' || qt === 'celebrate_then_explain_back';
    const isWrong =
      hasUserAttempted &&
      (qt === 'hint_with_question' || qt === 'foundational' || qt === 'encouragement');

    // Don't flash on the very first render (e.g. resuming a quest); only react
    // to turns the kid actually produced this session.
    if (isFirstTurn && !isLoading) {
      if (isCorrect) setStreak((s) => s + 1);
      return;
    }

    if (isCorrect) {
      setSceneResult('correct');
      playSound('correct');
      setStreak((s) => {
        const next = s + 1;
        setRewardBurst({ key: Date.now(), combo: next });
        return next;
      });
    } else if (isWrong) {
      setSceneResult('wrong');
      playSound('wrong');
      setStreak(0);
    } else {
      setSceneResult(null);
    }

    const t = setTimeout(() => {
      setSceneResult(null);
      setRewardBurst(null);
    }, 1100);
    return () => clearTimeout(t);
  }, [lastAssistant?.id, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Floating +XP chips on each correct answer (bigger reward for combos).
  useEffect(() => {
    if (sceneResult !== 'correct') return;
    const amount = 10 + Math.max(0, streak - 1) * 5; // 10, 15, 20… as the streak builds
    const key = Date.now();
    setXpFloats((f) => [...f, { key, amount }]);
    const t = setTimeout(() => setXpFloats((f) => f.filter((x) => x.key !== key)), 1000);
    return () => clearTimeout(t);
  }, [sceneResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live learner-model HUD data (buddy growth + thinking powers). Fetched on
  // mount and on each new adventure so the persistent HUD is never empty, and
  // so a buddy level-up earned last session is celebrated when the kid returns.
  const refreshLearner = useCallback(async () => {
    if (!userId || userId === 'anonymous') return;
    try {
      const [traitsRes, buddyRes] = await Promise.all([
        fetch(`${getApiBase()}/api/learner/traits?userId=${encodeURIComponent(userId)}`, { headers: getJsonHeaders() }).catch(() => null),
        fetch(`${getApiBase()}/api/learner/buddy?userId=${encodeURIComponent(userId)}`, { headers: getJsonHeaders() }).catch(() => null),
      ]);
      if (traitsRes?.ok) {
        const t = await traitsRes.json().catch(() => null);
        if (t?.success && t.traits?.habits) setHabits(t.traits.habits);
      }
      if (buddyRes?.ok) {
        const b = await buddyRes.json().catch(() => null);
        if (b?.success && b.buddy) {
          const level = b.buddy.level ?? 1;
          setBuddy({ level, callback: b.buddy.callback ?? null, taughtCount: Object.keys(b.buddy.conceptKnowledge ?? {}).length });
          const prev = prevBuddyLevelRef.current;
          if (prev !== null && level > prev) {
            setCompanionLevelUp(level);
            playSound('levelUp');
          }
          prevBuddyLevelRef.current = level;
        }
      }
    } catch { /* non-critical */ }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshLearner(); }, [refreshLearner, activeQuest?.id]);

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
    fetch(`${getApiBase()}/api/game/scene-image`, {
      method: 'POST',
      headers: getJsonHeaders(apiKey),
      body: JSON.stringify({
        questTitle: activeQuest.title,
        chapter: activeQuest.chapter,
        tags: activeQuest.tags ?? [],
        phase: 'playing',
      }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; imageUrl?: string | null }) => {
        if (data?.success && data.imageUrl) setAiSceneUrl(data.imageUrl);
      })
      .catch(() => { /* silently fall back to SVG scene */ });
  }, [activeQuest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoice = useCallback(
    (text: string, _letter?: string) => {
      playSound('tap');
      setChoiceAnimKey((k) => k + 1);
      // Kid mode is visual-first (SceneCanvas). Tag the turn's representation so
      // the learner-model channel inference can credit what precedes breakthroughs.
      onSendMessage(text, undefined, { representation: 'visual' });
    },
    [onSendMessage, playSound]
  );

  // When the child finishes a manipulative, translate what they BUILT into a
  // natural answer and feed it back into the Socratic loop — tagged as a
  // 'manipulative' representation so the learner model credits the channel.
  const handleInteractionComplete = useCallback(
    (result: InteractionResult) => {
      if (interactiveSpec) solvedSpecRef.current.add(interactiveSpec.id);
      playSound('correct');
      let msg = 'Done!';
      if (result.kind === 'equal_groups') {
        const d = result.detail as { groups: number; perGroup: number; total: number } | undefined;
        msg = d
          ? `I made ${d.groups} groups of ${d.perGroup}, so ${d.total} in all.`
          : 'I built it!';
      } else if (result.kind === 'sort_categorize') {
        msg = result.correct ? 'I sorted them all into the right groups!' : 'I sorted them.';
      } else if (result.kind === 'partition_split') {
        const d = result.detail as { numerator: number; denominator: number } | undefined;
        msg = d ? `I shaded ${d.numerator} out of ${d.denominator} parts — that's ${d.numerator}/${d.denominator}.` : 'I shaded the fraction.';
      } else if (result.kind === 'place_on_scale') {
        const d = result.detail as { placed: Record<string, number> } | undefined;
        const vals = d ? Object.values(d.placed) : [];
        msg = vals.length === 1 ? `I placed it at ${vals[0]} on the number line.` : 'I placed them on the number line.';
      } else if (result.kind === 'complete_pattern') {
        const d = result.detail as { fills: string[] } | undefined;
        const last = d?.fills?.[d.fills.length - 1];
        msg = last ? `The next one is ${last}.` : 'I completed the pattern.';
      } else if (result.kind === 'order_sequence') {
        msg = 'I put them all in the right order!';
      } else if (result.kind === 'match_connect') {
        msg = 'I matched them all up!';
      }
      onSendMessage(msg, undefined, {
        representation: 'manipulative',
        responseTimeMs: result.durationMs,
      });
    },
    [interactiveSpec, onSendMessage, playSound]
  );

  const handleInteractionSignal = useCallback(
    (signal: 'pick_up' | 'drop_correct' | 'drop_wrong' | 'all_placed') => {
      if (signal === 'pick_up') playSound('tap');
      else if (signal === 'drop_wrong') playSound('wrong');
    },
    [playSound]
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
        const [summaryRes, traitsRes, buddyRes] = await Promise.all([
          fetch(`${getApiBase()}/api/progress/summary?userId=${encodeURIComponent(userId)}`, {
            headers: getJsonHeaders(),
          }),
          fetch(`${getApiBase()}/api/learner/traits?userId=${encodeURIComponent(userId)}`, {
            headers: getJsonHeaders(),
          }).catch(() => null),
          fetch(`${getApiBase()}/api/learner/buddy?userId=${encodeURIComponent(userId)}`, {
            headers: getJsonHeaders(),
          }).catch(() => null),
        ]);
        if (summaryRes.ok) {
          const data = await summaryRes.json() as { success: boolean; summary: typeof progressSummary };
          if (data.success && data.summary) setProgressSummary(data.summary);
        }
        if (traitsRes?.ok) {
          const t = await traitsRes.json().catch(() => null);
          if (t?.success && t.traits?.habits) setHabits(t.traits.habits);
        }
        if (buddyRes?.ok) {
          const b = await buddyRes.json().catch(() => null);
          if (b?.success && b.buddy) {
            setBuddy({
              level: b.buddy.level ?? 1,
              callback: b.buddy.callback ?? null,
              taughtCount: Object.keys(b.buddy.conceptKnowledge ?? {}).length,
            });
          }
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
            Quest complete.
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-300 text-sm max-w-xs">
            You worked through it. Ready for the next one?
          </p>
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
            Next adventure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="game-scene"
      className={cn(
        'relative flex h-full flex-col overflow-hidden',
        sceneResult === 'correct' && 'animate-[scorePop_0.4s_ease-out]',
        sceneResult === 'wrong' && 'animate-[wrongShake_0.4s_ease-out]'
      )}
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

      {/* ── 0. Companion HUD — persistent progression (buddy + XP + thinking powers) ── */}
      <div className="relative shrink-0 px-3 pt-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/90">
          <Companion level={companionLevel} mood={companionMood} size={46} imageSrc={BUDDY_AVATAR_SRC} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                Buddy · Level {companionLevel}
              </span>
              {streak >= 2 && (
                <span
                  className={cn(
                    'ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold',
                    streak >= 3
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-[scorePop_0.5s_ease-out]'
                      : 'text-orange-500'
                  )}
                >
                  🔥 {streak >= 3 ? `ON FIRE · ${streak}` : streak}
                </span>
              )}
            </div>
            {/* Adventure XP bar */}
            <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
              {/* Floating +XP chips */}
              {xpFloats.map((x) => (
                <span
                  key={x.key}
                  className="pointer-events-none absolute -top-4 right-1 text-xs font-extrabold text-amber-500 animate-[xpFloat_1s_ease-out_forwards]"
                >
                  +{x.amount} XP
                </span>
              ))}
            </div>
            {/* Thinking Powers — live, no scores */}
            <div className="mt-1.5 flex items-center gap-1">
              {KID_HABIT_ORDER.map((k) => {
                const meta = KID_HABIT_META[k];
                const h = habits?.[k];
                const lit = !!h && h.score >= 0.5;
                return (
                  <span
                    key={k}
                    title={meta.label + (h?.trend === 'up' ? ' (rising!)' : '')}
                    className={cn(
                      'text-sm transition-all',
                      lit ? 'opacity-100' : 'opacity-25 grayscale'
                    )}
                  >
                    {meta.emoji}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. Scene Canvas — the decorative themed scene. Hidden while a
              manipulative is active so the GAME is the focus, not chrome. The
              HUD's buddy avatar still carries RM's presence + reactions. ───── */}
      {!showInteraction && (
        <div className="relative shrink-0 px-3 pt-2">
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
            lastResult={sceneResult}
          />

          {/* RM hero — the protagonist standing in the scene, reacting to answers */}
          <SceneHero src={BUDDY_AVATAR_SRC} mood={companionMood} />

          {/* Reward burst — pops over the scene on a correct answer, with a combo
              streak so consecutive wins build momentum (Fortnite-style "you're on fire"). */}
          {rewardBurst && (
            <div
              key={rewardBurst.key}
              className="pointer-events-none absolute inset-x-0 top-4 z-30 flex flex-col items-center gap-1 animate-[comboPop_0.5s_ease-out]"
            >
              {rewardBurst.combo >= 2 ? (
                <>
                  <div className="text-3xl drop-shadow-lg">🔥</div>
                  <div className="rounded-full bg-orange-500/95 px-4 py-1 text-sm font-extrabold text-white shadow-lg">
                    {rewardBurst.combo} in a row!
                  </div>
                </>
              ) : (
                <div className="rounded-full bg-emerald-500/95 px-4 py-1 text-sm font-extrabold text-white shadow-lg">
                  Nice! +1 ⭐
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* ── 2b. Mission card — the canonical problem (single source of truth).
              Hidden when a manipulative is active: the game renders its own
              mission, so showing both would duplicate the prompt. ── */}
      {!showInteraction && (
        <div className="shrink-0 px-3 pt-2">
          <div
            data-testid="quest-prompt"
            className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/30"
          >
            <div className="mb-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-500 dark:text-amber-400">
              <span>🎯</span> Mission
            </div>
            <p className="text-[15px] font-semibold leading-snug text-amber-900 dark:text-amber-200">
              {activeQuest.prompt}
            </p>
          </div>
        </div>
      )}

      {/* ── 2b. Speech Bubble — hidden during a manipulative (the game shows
              its own mission, so the bubble would only duplicate it). ─────── */}
      {!showInteraction && (
      <div className="relative shrink-0 px-3 pt-2">
        <div
          data-testid="vidya-bubble"
          className={cn(
            'flex items-start gap-3 rounded-2xl border-2 bg-white/95 px-4 py-3 shadow-lg dark:bg-slate-800/95',
            theme.border
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
            {/* Buddy growth cue — teaching the buddy is how it learns from the kid */}
            {questionType === 'celebrate_then_explain_back' && (
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-800/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                <span>🌱</span> Your buddy is learning from you!
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
            {voiceIsPlaying && !isLoading && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-400 shrink-0" aria-label="Playing audio" />
              </div>
            )}
            {voiceIsLoading && !isLoading && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-400 shrink-0" />
                <span>Reading aloud...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

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

      {/* ── 3. Interaction zone: a playable manipulative when the problem maps
              to one, otherwise the choice cards (graceful fallback). ───────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3">
        {showInteraction && interactiveSpec ? (
          <>
            <InteractionRenderer
              key={interactiveSpec.id}
              spec={interactiveSpec}
              onComplete={handleInteractionComplete}
              onSignal={handleInteractionSignal}
            />
            {/* Escape hatches stay available during the manipulative */}
            <div className="mt-3 flex justify-center gap-2">
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
          </>
        ) : choices.length > 0 && !isLoading ? (
          <div
            key={choiceAnimKey}
            className={cn(
              'grid gap-2',
              choices.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
            )}
          >
            {choices.map((c, i) => {
              return (
                <div key={i} className="relative">
                  <button
                    data-testid={`choice-${c.letter}`}
                    aria-label={`Choice ${c.letter}: ${c.text}`}
                    onClick={() => handleChoice(c.text, c.letter)}
                    disabled={isLoading}
                    className={cn(
                      'group relative overflow-hidden w-full flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-1.5 rounded-2xl border-b-4 bg-gradient-to-br px-4 py-3.5 sm:py-5 text-left sm:text-center font-extrabold text-white shadow-lg transition-all duration-150',
                      'hover:-translate-y-0.5 hover:shadow-xl hover:brightness-110 active:translate-y-0.5 active:border-b-2 active:brightness-95 disabled:opacity-40',
                      'ring-1 ring-white/20',
                      CHOICE_COLORS[i % CHOICE_COLORS.length],
                      'animate-[bubbleAppear_0.25s_ease-out]'
                    )}
                    style={{ animationDelay: `${i * 70}ms`, minHeight: 64 }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/25 text-base font-fredoka shadow-inner ring-1 ring-white/30">
                      {c.letter}
                    </span>
                    {/* Color swatch — when the answer names a color, show the actual color */}
                    {colorOf(c.text) && (
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded-full border-2 border-white/70 shadow-inner"
                        style={{ backgroundColor: colorOf(c.text) as string }}
                      />
                    )}
                    <span className="text-[15px] leading-tight drop-shadow-sm">{c.text}</span>
                    {/* Shimmer sweep on hover */}
                    <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </span>
                  </button>
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
        {!showInteraction && choices.length > 0 && !isLoading && (
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
          <div
            data-testid="quest-progress"
            className={cn(
              'flex items-center gap-2',
              sceneResult === 'correct' && 'animate-[comboPop_0.5s_ease-out]'
            )}
          >
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
            onClick={() => setShowNarrativeExit(true)}
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

                {/* Thinking Powers — kid-facing habits of mind (no scores) */}
                {habits && Object.keys(habits).length > 0 && (
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-900/30 px-4 py-3">
                    <p className="font-bold text-violet-700 dark:text-violet-300 mb-1.5">Your Thinking Powers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {KID_HABIT_ORDER.filter((k) => habits[k]).map((k) => {
                        const meta = KID_HABIT_META[k];
                        const lit = habits[k].score >= 0.5;
                        return (
                          <span
                            key={k}
                            title={meta.label}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                              lit
                                ? 'bg-violet-200 text-violet-800 dark:bg-violet-700/60 dark:text-violet-100'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50'
                            )}
                          >
                            <span>{meta.emoji}</span>
                            <span>{meta.label}</span>
                            {habits[k].trend === 'up' && <span className="text-emerald-500">↑</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Buddy growth — the teachable-agent projection */}
                {buddy && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
                    <span className="text-slate-600 dark:text-slate-300">Your buddy is </span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">Level {buddy.level}</span>
                    {buddy.taughtCount > 0 && (
                      <span className="text-slate-600 dark:text-slate-300">
                        {' '}— you've taught it {buddy.taughtCount} thing{buddy.taughtCount !== 1 ? 's' : ''}!
                      </span>
                    )}
                  </div>
                )}
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
              Back to it
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
              Challenge Level {newChallengeLevel}
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Harder problems ahead.
            </p>
            <button
              onClick={() => setShowAdaptiveLevelUp(false)}
              className="bg-amber-500 text-white rounded-2xl px-6 py-2 font-bold text-sm hover:bg-amber-600 transition-colors"
            >
              Let's go
            </button>
          </div>
        </div>
      )}

      {/* Buddy level-up — meta-progression reward for what the kid taught it */}
      {companionLevelUp !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setCompanionLevelUp(null)}
        >
          <div
            className="mx-4 max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900 animate-[comboPop_0.4s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 w-fit">
              <Companion level={companionLevelUp} mood="happy" size={120} showLevel={false} imageSrc={BUDDY_AVATAR_SRC} variant="full" />
            </div>
            <h2 className="font-fredoka text-2xl text-amber-500 dark:text-amber-400">
              Your buddy reached Level {companionLevelUp}!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              It grew from everything you taught it. Keep teaching to unlock more.
            </p>
            <button
              onClick={() => setCompanionLevelUp(null)}
              className="mt-5 rounded-2xl bg-amber-500 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Transition warning card — phase change preview for neurodiverse learners */}
      {transitionMessage && (
        <TransitionCard
          message={transitionMessage}
          onDismiss={() => setTransitionMessage(null)}
          calmMode={calmMode}
        />
      )}

      {/* Narrative exit — calm session end, replaces abrupt navigation */}
      {showNarrativeExit && (
        <NarrativeExit
          questTheme={
            activeQuest?.chapter
              ? CHAPTER_TO_NARRATIVE_THEME[activeQuest.chapter] ?? null
              : null
          }
          onDismiss={onEndSession}
          calmMode={calmMode ?? false}
        />
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
