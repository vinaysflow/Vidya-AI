import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Menu, Settings, Plus, Mic, Pencil, Trophy, Eye, EyeOff } from 'lucide-react';
import { useChatStore, useIsKidMode, SUBJECT_META, LANGUAGE_META, type Language } from '../../stores/chatStore';
import { Message } from './Message';
import { WelcomeScreen } from './WelcomeScreen';
import { Sidebar } from './Sidebar';
import { SettingsPanel } from './SettingsPanel';
import { SessionSummaryCard } from './SessionSummaryCard';
import { OnboardingPanel } from './OnboardingPanel';
import { LearnerInsightsCard } from './LearnerInsightsCard';
import { SessionQuizCard } from './SessionQuizCard';
import { cn } from '../../lib/utils';
import { FEATURE_FREEZE, VOICE_ENABLED } from '../../lib/featureFlags';
import { VoiceButton } from '../voice/VoiceButton';
import { XPBar } from '../gamification/XPBar';
import { StreakBanner } from '../gamification/StreakBanner';
import { LevelUpModal } from '../gamification/LevelUpModal';
import { AvatarReactions } from '../avatar/AvatarReactions';
import { StudentCanvas } from '../whiteboard/StudentCanvas';
import { GameScene } from '../kid/GameScene';
import { ParentSetupScreen } from '../kid/ParentSetupScreen';
import { RoleSelectorScreen } from '../kid/RoleSelectorScreen';

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [voicePreviewText, setVoicePreviewText] = useState<string | null>(null);
  const voicePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<{ clearCanvas: () => void } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const isKidMode = useIsKidMode();
  const {
    messages, isLoading, sessionId, language, subject,
    sendMessage, startSession, clearChat, endSession, generateQuiz,
    sidebarOpen, setSidebarOpen, setSettingsOpen,
    currentReport,
    hasCompletedOnboarding,
    userId,
    fetchProfileAndMastery,
    learnerState,
    currentQuiz,
    isQuizLoading,
    planTier,
    gamification,
    fetchGamificationProfile,
    dismissLevelUp,
    clearGamificationAnimations,
    setLanguage,
    setSubject,
    setQuestConceptKey,
    voiceEnabled,
    parentViewEnabled,
    setParentViewEnabled,
    activeQuest,
    grade,
    kidModeEnabled,
  } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    fetchGamificationProfile();
    clearGamificationAnimations();
  }, []);

  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      fetchProfileAndMastery(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!languageMenuRef.current) return;
      if (languageMenuRef.current.contains(event.target as Node)) return;
      setLanguageMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [languageMenuOpen]);

  useEffect(() => () => {
    if (voicePreviewTimerRef.current) clearTimeout(voicePreviewTimerRef.current);
  }, []);

  // Quest completion for kids is handled inside GameScene (victory screen + "Next Adventure!" button).
  // No auto-end here — the kid controls when to move on.

  const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').pop();
  const showingQuestScene = isKidMode && sessionId && messages.length > 0 && !currentReport;
  const showExplainBackPrompt =
    isKidMode &&
    !isLoading &&
    sessionId &&
    lastAssistantMessage?.metadata?.questionType === 'celebrate_then_explain_back';

  const cancelVoicePreview = useCallback(() => {
    if (voicePreviewTimerRef.current) {
      clearTimeout(voicePreviewTimerRef.current);
      voicePreviewTimerRef.current = null;
    }
    setVoicePreviewText(null);
    setInput('');
  }, []);

  const handleVoiceTranscription = useCallback(
    (text: string) => {
      if (!isKidMode) {
        setInput((prev) => (prev ? prev + ' ' + text : text));
        return;
      }
      setInput(text);
      setVoicePreviewText(text);
      if (voicePreviewTimerRef.current) clearTimeout(voicePreviewTimerRef.current);
      voicePreviewTimerRef.current = setTimeout(async () => {
        voicePreviewTimerRef.current = null;
        setVoicePreviewText(null);
        if (text.trim() && sessionId) {
          await sendMessage(text.trim());
        }
        setInput('');
      }, 1500);
    },
    [isKidMode, sessionId, sendMessage]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    const imageToSend = attachedImage || undefined;
    setInput('');
    setAttachedImage(null);
    if (!sessionId) {
      await startSession(message, imageToSend);
    } else {
      await sendMessage(message, imageToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSendDrawing = useCallback(
    (dataUrl: string) => {
      setAttachedImage(dataUrl);
      setInput('Here is my drawing!');
      setDrawingOpen(false);
      canvasRef.current?.clearCanvas();
      // Submit after a tick so state has updated
      setTimeout(() => {
        if (!sessionId) {
          startSession('Here is my drawing!', dataUrl);
        } else {
          sendMessage('Here is my drawing!', dataUrl);
        }
        setAttachedImage(null);
        setInput('');
      }, 0);
    },
    [sessionId, startSession, sendMessage]
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const subjectMeta = SUBJECT_META.find(s => s.id === subject);
  const subjectLabel = subjectMeta?.label[language] || subjectMeta?.label.EN || subject;
  const langMeta = LANGUAGE_META[language];

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang.toLowerCase());
    setLanguageMenuOpen(false);
  };

  const quickActions = isKidMode
    ? [
        { label: "I'm stuck", icon: '?' },
        { label: 'Help me!', icon: '!' },
        { label: 'Say it differently', icon: '~' },
      ]
    : [
        { label: language === 'HI' ? 'मुझे समझ नहीं आया' : language === 'ZH' ? '我不理解' : language === 'FR' ? 'Je ne comprends pas' : language === 'DE' ? 'Ich verstehe nicht' : language === 'ES' ? 'No entiendo' : "I don't understand", icon: '?' },
        { label: language === 'HI' ? 'एक hint दीजिए' : language === 'ZH' ? '给我一个提示' : language === 'FR' ? 'Un indice' : language === 'DE' ? 'Ein Hinweis' : language === 'ES' ? 'Una pista' : 'Give me a hint', icon: '!' },
        { label: language === 'HI' ? 'दूसरे तरीके से समझाइए' : language === 'ZH' ? '换种方式解释' : language === 'FR' ? 'Expliquez autrement' : language === 'DE' ? 'Anders erklaeren' : language === 'ES' ? 'Explica de otra forma' : 'Explain differently', icon: '~' },
      ];

  return (
    <div className="flex h-full">
      <Sidebar />
      <SettingsPanel />
      {!hasCompletedOnboarding && kidModeEnabled === false && <OnboardingPanel />}

      <div className={cn(
        'flex flex-col flex-1 min-w-0',
        isKidMode
          ? 'bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900'
      )}>
        {/* Header */}
        <header className={cn(
          'flex items-center gap-3 px-4 py-2.5 border-b shadow-sm backdrop-blur-md',
          isKidMode
            ? 'border-amber-200/70 bg-amber-50/90'
            : 'border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/70'
        )}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-4.5 h-4.5 text-slate-500" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <AvatarReactions
              isLoading={isLoading}
              hasMessages={messages.length > 0}
              isSessionEnded={!!currentReport}
              recentXp={gamification?.recentXp}
            />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{t('app.name')}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {gamification && gamification.currentStreak > 0 && (
              <StreakBanner streak={gamification.currentStreak} streakFreezes={gamification.streakFreezes} />
            )}
            {/* Subject badge — only show when there is an active session (messages exist) */}
            {messages.length > 0 && (
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r",
                subjectMeta?.color || "from-slate-400 to-slate-500"
              )}>
                {isKidMode ? (subject === 'MATHEMATICS' ? 'Math' : subject === 'PHYSICS' ? 'Science' : subjectLabel) : subjectLabel}
              </span>
            )}

            {/* Language picker - hidden in kid mode */}
            {!isKidMode && (
            <div ref={languageMenuRef} className="relative">
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100/90 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={t('settings.language')}
              >
                {langMeta?.flag} {langMeta?.native || language}
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-md p-1 z-50">
                  {(Object.entries(LANGUAGE_META) as [Language, typeof LANGUAGE_META.EN][]).map(([code, meta]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageSelect(code)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors",
                        language === code
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <span className="text-sm">{meta.flag}</span>
                      <span className="font-medium">{meta.native}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{meta.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {isKidMode && (
              <button
                onClick={() => setParentViewEnabled(!parentViewEnabled)}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  parentViewEnabled
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                )}
                title={parentViewEnabled ? 'Hide parent view' : 'Show parent view'}
              >
                {parentViewEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {sessionId && (
              <button
                onClick={clearChat}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={t('chat.newChat')}
              >
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            )}

            {sessionId && !isKidMode && (
              <button
                onClick={endSession}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                title="End session"
                disabled={isLoading}
              >
                End session
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </header>

        {FEATURE_FREEZE && (
          <div className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
            Feature freeze active — non-critical features are temporarily disabled.
          </div>
        )}

        {gamification && (
          <XPBar
            xp={gamification.xp}
            level={gamification.level}
            nextLevelXp={gamification.nextLevelXp}
            recentXp={gamification.recentXp}
          />
        )}

        {gamification?.pendingLevelUp && (
          <LevelUpModal level={gamification.pendingLevelUp} onClose={dismissLevelUp} isKidMode={isKidMode} />
        )}

        {/* Messages or Game View */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {kidModeEnabled == null && messages.length === 0 ? (
            <div key="role-selector" className="flex-1 overflow-y-auto">
              <RoleSelectorScreen />
            </div>
          ) : kidModeEnabled === true && grade == null && messages.length === 0 ? (
            <div key="parent-setup" className="flex-1 overflow-y-auto">
              <ParentSetupScreen />
            </div>
          ) : messages.length === 0 ? (
            <div key="welcome" className="animate-[screenSlideIn_0.35s_ease-out] flex-1 overflow-y-auto px-4 py-6 space-y-4">
              <WelcomeScreen onStarterClick={(text, subj, conceptKey) => { if (subj) setSubject(subj); if (conceptKey) setQuestConceptKey(conceptKey); startSession(text); }} />
              {learnerState && !isKidMode && <LearnerInsightsCard state={learnerState} />}
              {currentReport && isKidMode && (
                <div data-testid="kid-report" className="rounded-2xl border-2 border-amber-200 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 shadow-sm animate-fade-in">
                  <div className="flex flex-col items-center text-center gap-4">
                    <Trophy className="h-12 w-12 text-amber-500" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Amazing job!</h3>
                    {currentReport.conceptsEngaged?.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {currentReport.conceptsEngaged.map((c, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-200 dark:bg-amber-700/50 text-amber-800 dark:text-amber-200">{c}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">You talked to Vidya for {currentReport.durationMinutes || 0} minutes!</p>
                    <button
                      data-testid="next-adventure"
                      onClick={() => { clearChat(); if (userId && userId !== 'anonymous') fetchProfileAndMastery(userId); }}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                      Next Adventure!
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isKidMode && sessionId && !currentReport ? (
            <div key={activeQuest?.id ?? 'game'} className="animate-[screenSlideIn_0.35s_ease-out] flex flex-1 flex-col overflow-hidden">
              <GameScene
                messages={messages}
                isLoading={isLoading}
                onSendMessage={sendMessage}
                onEndSession={endSession}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              {messages.map((message, index) => (
                <Message key={message.id || index} message={message} />
              ))}

              {currentReport && (
                <>
                  {isKidMode ? (
                    <div data-testid="kid-report" className="rounded-2xl border-2 border-amber-200 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 shadow-sm animate-fade-in">
                  <div className="flex flex-col items-center text-center gap-4">
                    <Trophy className="h-12 w-12 text-amber-500" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Amazing job!
                    </h3>
                    {currentReport.conceptsEngaged?.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {currentReport.conceptsEngaged.map((c, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-200 dark:bg-amber-700/50 text-amber-800 dark:text-amber-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      You talked to Vidya for {currentReport.durationMinutes || 0} minutes!
                    </p>
                    <button
                      data-testid="next-adventure"
                      onClick={() => {
                        clearChat();
                        if (userId && userId !== 'anonymous') fetchProfileAndMastery(userId);
                      }}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                      Next Adventure!
                    </button>
                  </div>
                </div>
                  ) : (
                    <SessionSummaryCard report={currentReport} />
                  )}
                  {!isKidMode && (
                    currentQuiz ? (
                      <SessionQuizCard quiz={currentQuiz} />
                    ) : (
                      <div className="mt-3">
                        {FEATURE_FREEZE ? (
                          <button
                            disabled
                            className="px-3 py-2 rounded-lg text-xs font-semibold border border-amber-200 text-amber-500 dark:border-amber-700 dark:text-amber-300 cursor-not-allowed"
                          >
                            Quizzes disabled during feature freeze
                          </button>
                        ) : planTier === 'PRO' ? (
                          <button
                            onClick={() => generateQuiz(3)}
                            disabled={isQuizLoading}
                            className={cn(
                              "px-3 py-2 rounded-lg text-xs font-semibold border",
                              isQuizLoading
                                ? "border-slate-200 text-slate-400 dark:border-slate-700"
                                : "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                            )}
                          >
                            {isQuizLoading ? 'Generating quiz…' : 'Generate quick quiz'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSettingsOpen(true)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                          >
                            Upgrade to Pro to unlock quizzes
                          </button>
                        )}
                      </div>
                    )
                  )}
                </>
              )}

          {isLoading && (
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('chat.thinking')}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
          )}
        </div>

        {/* Explain-back prompt - big "Talk to Vidya!" when kid gets celebrate_then_explain_back (hidden when QuestScene shown) */}
        {!showingQuestScene && showExplainBackPrompt && (
          <div className="px-4 pb-3">
            <div className="rounded-2xl border-2 border-amber-400/80 dark:border-amber-500/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 p-6 animate-fade-in">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center animate-pulse shadow-lg">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Tell Vidya WHY it works!
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Tap the mic and explain!
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <VoiceButton
                    language={language.toLowerCase()}
                    onTranscription={handleVoiceTranscription}
                    disabled={isLoading}
                    size="large"
                  />
                  <button
                    type="button"
                    onClick={() => setDrawingOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                  >
                    <Pencil className="w-5 h-5" />
                    Or draw it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice preview toast - kid mode: show before auto-send (hidden when QuestScene shown) */}
        {!showingQuestScene && voicePreviewText && (
          <div className="px-4 pb-2">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 p-3 flex items-center justify-between gap-3 animate-fade-in">
              <p className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">
                Sending: &quot;{voicePreviewText.slice(0, 60)}
                {voicePreviewText.length > 60 ? '...' : ''}&quot;
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 rounded-full bg-amber-300 dark:bg-amber-600 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 rounded-full animate-voice-preview-bar"
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  onClick={cancelVoicePreview}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions -- hidden when QuestScene shown (it has its own) */}
        {!showingQuestScene && messages.length > 0 && !isLoading && (!showExplainBackPrompt || isKidMode) && (
          <div className={cn(
            "px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide",
            isKidMode && "justify-center flex-wrap"
          )}>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => isKidMode ? sendMessage(action.label) : setInput(action.label)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95",
                  isKidMode
                    ? "px-5 py-3 rounded-2xl text-sm font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-2 border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/50"
                    : "px-3 py-1.5 rounded-full text-xs bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-500"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Draw canvas - kid mode, slides above input (QuestScene has its own) */}
        {!showingQuestScene && isKidMode && drawingOpen && (
          <div className="border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Draw your thinking</span>
              <button
                onClick={() => setDrawingOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Close
              </button>
            </div>
            <StudentCanvas
              ref={canvasRef}
              isKidMode
              onSendDrawing={handleSendDrawing}
            />
          </div>
        )}

        {/* Input - hidden when QuestScene or explain-back prompt is showing */}
        {!showingQuestScene && !showExplainBackPrompt && isKidMode && sessionId && (
          <div className="border-t border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-4 py-4 safe-area-bottom">
            <div className="flex items-center justify-center gap-4">
              <VoiceButton
                language={language.toLowerCase()}
                onTranscription={handleVoiceTranscription}
                disabled={isLoading}
                size="large"
              />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">or</span>
              <button
                type="button"
                onClick={() => setDrawingOpen((o) => !o)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 rounded-2xl text-base font-bold transition-all active:scale-95',
                  drawingOpen
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
                )}
              >
                <Pencil className="w-6 h-6" />
                Draw it!
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
              Tap the mic to talk, or draw your answer!
            </p>
          </div>
        )}

        {!showingQuestScene && !showExplainBackPrompt && (!isKidMode || !sessionId) && (
        <div className="border-t border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 safe-area-bottom">
          {attachedImage && (
            <div className="mb-3 flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 p-3">
              <img
                src={attachedImage}
                alt="Attachment preview"
                className="h-16 w-16 rounded-lg object-cover border border-white/20"
              />
              <div className="flex-1">
                <div className="text-xs text-slate-600 dark:text-slate-300">Attached image</div>
                <button
                  onClick={() => setAttachedImage(null)}
                  className="mt-1 text-[10px] text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className={cn(
                  "w-full px-4 py-3 text-sm rounded-2xl",
                  "bg-slate-100 dark:bg-slate-700",
                  "border-2 border-transparent",
                  "focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600",
                  "outline-none transition-all",
                  "text-slate-800 dark:text-white",
                  "placeholder:text-slate-400 dark:placeholder:text-slate-500"
                )}
                disabled={isLoading}
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(sessionId) || FEATURE_FREEZE}
              className={cn(
                "px-3 py-3 rounded-2xl transition-all text-xs font-semibold",
                sessionId || FEATURE_FREEZE
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              )}
              title={FEATURE_FREEZE ? 'Image attachments disabled during feature freeze' : sessionId ? 'Attach image on session start only' : 'Attach image'}
            >
              Image
            </button>
            {(VOICE_ENABLED && voiceEnabled) && (
              <VoiceButton
                language={language.toLowerCase()}
                onTranscription={handleVoiceTranscription}
                disabled={isLoading}
                size="default"
              />
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3 rounded-2xl transition-all",
                "bg-gradient-to-r from-blue-600 to-purple-600",
                "text-white shadow-lg shadow-blue-500/25",
                "hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              )}
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
          {input.length > 200 && (
            <p className={cn(
              "text-xs mt-1 text-right",
              input.length > 4500 ? "text-red-500" : "text-slate-400"
            )}>
              {input.length}/5000
            </p>
          )}
          {subject === 'ESSAY_WRITING' && input.trim().length > 0 && (
            <p className="text-xs mt-1 text-right text-violet-500 font-medium">
              Words: {input.trim().split(/\s+/).filter(Boolean).length}
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
