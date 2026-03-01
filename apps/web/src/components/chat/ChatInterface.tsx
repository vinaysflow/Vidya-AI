import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Menu, Settings, Plus } from 'lucide-react';
import { useChatStore, SUBJECT_META, LANGUAGE_META, type Language } from '../../stores/chatStore';
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

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const {
    messages, isLoading, sessionId, language, subject,
    sendMessage, startSession, clearChat, endSession, generateQuiz,
    sidebarOpen, setSidebarOpen, setSettingsOpen,
    currentReport,
    hasCompletedOnboarding,
    learnerState,
    currentQuiz,
    isQuizLoading,
    planTier,
    gamification,
    fetchGamificationProfile,
    dismissLevelUp,
    setLanguage,
    voiceEnabled,
  } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    fetchGamificationProfile();
  }, []);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    if (!sessionId) {
      await startSession(message, attachedImage || undefined);
    } else {
      await sendMessage(message);
    }
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

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

  const quickActions = [
    { label: language === 'HI' ? 'मुझे समझ नहीं आया' : language === 'ZH' ? '我不理解' : language === 'FR' ? 'Je ne comprends pas' : language === 'DE' ? 'Ich verstehe nicht' : language === 'ES' ? 'No entiendo' : "I don't understand", icon: '?' },
    { label: language === 'HI' ? 'एक hint दीजिए' : language === 'ZH' ? '给我一个提示' : language === 'FR' ? 'Un indice' : language === 'DE' ? 'Ein Hinweis' : language === 'ES' ? 'Una pista' : 'Give me a hint', icon: '!' },
    { label: language === 'HI' ? 'दूसरे तरीके से समझाइए' : language === 'ZH' ? '换种方式解释' : language === 'FR' ? 'Expliquez autrement' : language === 'DE' ? 'Anders erklaeren' : language === 'ES' ? 'Explica de otra forma' : 'Explain differently', icon: '~' },
  ];

  return (
    <div className="flex h-full">
      <Sidebar />
      <SettingsPanel />
      {!hasCompletedOnboarding && <OnboardingPanel />}

      <div className="flex flex-col flex-1 min-w-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
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
            {/* Subject badge */}
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r",
              subjectMeta?.color || "from-slate-400 to-slate-500"
            )}>
              {subjectLabel}
            </span>

            {/* Language picker */}
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

            {sessionId && (
              <button
                onClick={clearChat}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={t('chat.newChat')}
              >
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
            )}

            {sessionId && (
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
          <LevelUpModal level={gamification.pendingLevelUp} onClose={dismissLevelUp} />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <>
              <WelcomeScreen onStarterClick={(text) => setInput(text)} />
              {learnerState && <LearnerInsightsCard state={learnerState} />}
            </>
          ) : (
            messages.map((message, index) => (
              <Message key={message.id || index} message={message} />
            ))
          )}

          {currentReport && (
            <>
              <SessionSummaryCard report={currentReport} />
              {currentQuiz ? (
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

        {/* Quick actions */}
        {messages.length > 0 && !isLoading && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => setInput(action.label)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300",
                  "text-xs whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-600",
                  "transition-colors border border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-500"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
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
                  "w-full px-4 py-3 rounded-2xl",
                  "bg-slate-100 dark:bg-slate-700",
                  "border-2 border-transparent",
                  "focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600",
                  "outline-none transition-all",
                  "text-sm text-slate-800 dark:text-white",
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
            {VOICE_ENABLED && voiceEnabled && (
              <VoiceButton
                language={language.toLowerCase()}
                onTranscription={(text) => {
                  setInput((prev) => (prev ? prev + ' ' + text : text));
                }}
                disabled={isLoading}
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
        </div>
      </div>
    </div>
  );
}
