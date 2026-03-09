import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Key, Sun, Moon, Laptop, Mic, User, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useChatStore,
  LANGUAGE_META,
  type Language,
} from '../../stores/chatStore';
import { VOICE_ENABLED } from '../../lib/featureFlags';
import { getApiBase, getJsonHeaders } from '../../lib/api';

const API_BASE = getApiBase();

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const {
    language, setLanguage,
    apiKey, setApiKey,
    userId, setUserId,
    grade, setGrade,
    settingsOpen, setSettingsOpen,
    noFinalAnswerMode, setNoFinalAnswerMode,
    planTier, setPlanTier,
    theme, setTheme,
    voiceEnabled, setVoiceEnabled,
    hasCompletedOnboarding,
    startOnboarding,
    resetAll,
  } = useChatStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [keySaved, setKeySaved] = useState(false);
  const [userIdInput, setUserIdInput] = useState(userId || '');
  const [userIdSaved, setUserIdSaved] = useState(false);
  const [gradeInput, setGradeInput] = useState(grade != null ? String(grade) : '');

  useEffect(() => {
    if (settingsOpen) {
      setKeyInput(apiKey || '');
      setUserIdInput(userId || '');
      setGradeInput(grade != null ? String(grade) : '');
    }
  }, [settingsOpen, apiKey, userId, grade]);

  if (!settingsOpen) return null;

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang.toLowerCase());
  };

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    setApiKey(trimmed || null);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleSaveUserId = () => {
    const trimmed = userIdInput.trim();
    setUserId(trimmed || null);
    setUserIdSaved(true);
    setTimeout(() => setUserIdSaved(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setSettingsOpen(false)} />
      <div className={cn(
        "fixed right-0 top-0 bottom-0 z-50 w-80",
        "bg-white/90 dark:bg-slate-900/80 border-l border-slate-200/70 dark:border-slate-700/70",
        "flex flex-col shadow-xl backdrop-blur-md animate-slide-up"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('settings.title')}
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Language */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {t('settings.language')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LANGUAGE_META) as [Language, typeof LANGUAGE_META.EN][]).map(([code, meta]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left",
                    "border-2",
                    language === code
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <span className="text-base">{meta.flag}</span>
                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{meta.native}</div>
                    <div className="text-[10px] text-slate-400">{meta.label}</div>
                  </div>
                  {language === code && (
                    <Check className="w-3.5 h-3.5 text-blue-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {t('settings.theme')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'SYSTEM', label: t('settings.themeSystem'), icon: Laptop },
                { key: 'LIGHT', label: t('settings.themeLight'), icon: Sun },
                { key: 'DARK', label: t('settings.themeDark'), icon: Moon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key as typeof theme)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left",
                    "border-2",
                    theme === key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Voice Mode */}
          {VOICE_ENABLED && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Voice Mode
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Voice input &amp; output
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Speak your questions, listen to replies
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors",
                    voiceEnabled
                      ? "border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30"
                      : "border-slate-300 text-slate-500 bg-white dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800"
                  )}
                >
                  {voiceEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </section>
          )}

          {/* User ID (dogfood / kid mode) */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              User ID
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              For dogfood: set to a child&apos;s userId (e.g. dogfood-child-001) to enable kid mode and quest UI.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="e.g. dogfood-child-001"
                  className={cn(
                    "w-full pl-9 pr-3 py-2 rounded-xl text-xs",
                    "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600",
                    "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none",
                    "text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  )}
                />
              </div>
              <button
                onClick={handleSaveUserId}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                  userIdSaved
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {userIdSaved ? <Check className="w-3.5 h-3.5" /> : 'Save'}
              </button>
            </div>
            {userId && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Using: {userId}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Leave empty for anonymous. Run setup-dogfood.ts to create child user.
            </p>
          </section>

          {/* Grade (kid mode) */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Grade
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Set to 3 (or 1–5) to enable kid mode: quests, voice-first, kid-friendly UI. Normally fetched from user profile; override here for testing.
            </p>
            <div className="flex gap-2">
              <select
                value={gradeInput || ''}
                onChange={(e) => {
                  setGradeInput(e.target.value);
                  const v = e.target.value ? parseInt(e.target.value, 10) : null;
                  if (v != null && !Number.isNaN(v)) setGrade(v);
                  else setGrade(null);
                }}
                className={cn(
                  "flex-1 px-3 py-2 rounded-xl text-xs",
                  "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600",
                  "focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200"
                )}
              >
                <option value="">Auto (from user profile)</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            {grade != null && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Kid mode: Grade {grade}
              </p>
            )}
          </section>

          {/* API Key */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {t('settings.apiKey')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Optional. Required for production use with rate limiting and billing.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className={cn(
                    "w-full pl-9 pr-3 py-2 rounded-xl text-xs",
                    "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600",
                    "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none",
                    "text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  )}
                />
              </div>
              <button
                onClick={handleSaveKey}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                  keySaved
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {keySaved ? <Check className="w-3.5 h-3.5" /> : 'Save'}
              </button>
            </div>
            {apiKey && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Key configured
              </p>
            )}
          </section>

          {/* Onboarding */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {t('settings.onboarding')}
            </h3>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-3 py-2">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {hasCompletedOnboarding ? t('settings.onboardingCompleted') : t('settings.onboardingIncomplete')}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t('settings.onboardingHint')}
                </div>
              </div>
              <button
                onClick={startOnboarding}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30"
              >
                {t('settings.restartOnboarding')}
              </button>
            </div>
          </section>

          {/* Safety mode — hidden in kid mode (grade <= 5); choices are the only interaction there */}
          {(!grade || grade > 5) && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Safety
            </h3>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-3 py-2">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  No-final-answer mode
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Prevents direct answers; always Socratic.
                </div>
              </div>
              <button
                onClick={() => setNoFinalAnswerMode(!noFinalAnswerMode)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                  noFinalAnswerMode
                    ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/30"
                    : "border-slate-300 text-slate-500 bg-white dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800"
                )}
              >
                {noFinalAnswerMode ? 'On' : 'Off'}
              </button>
            </div>
          </section>
          )}

          {/* Plan */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Plan
            </h3>
            <div className="space-y-2">
              <div className={cn(
                "rounded-xl border px-3 py-2",
                planTier === 'FREE'
                  ? "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Free</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Core tutoring + hints</div>
                  </div>
                  {planTier === 'FREE' && (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-300">Current</span>
                  )}
                </div>
              </div>
              <div className={cn(
                "rounded-xl border px-3 py-2",
                planTier === 'PRO'
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pro</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Quizzes + advanced insights</div>
                  </div>
                  {planTier === 'PRO' ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">Current</span>
                  ) : (
                    <button
                      onClick={() => setPlanTier('PRO')}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/30"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Reset */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Data
            </h3>
            {!confirmReset ? (
              <button
                data-testid="reset-all-btn"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Data
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  This clears all progress, XP, streaks, and grade. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    data-testid="reset-confirm-btn"
                    onClick={() => { resetAll(); setConfirmReset(false); setSettingsOpen(false); }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                  >
                    Yes, reset everything
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Delete My Data (COPPA compliance) */}
          <section>
            <DeleteMyDataButton />
          </section>

          {/* Report a Problem */}
          <section>
            <button
              onClick={() => {
                const { userId, grade, subject } = useChatStore.getState();
                const body = encodeURIComponent(
                  `\n\nDevice: ${navigator.userAgent}\nUserId: ${userId}\nGrade: ${grade}\nSubject: ${subject}`
                );
                window.open(`mailto:support@tryvidya.ai?subject=Bug Report&body=${body}`, '_blank');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Report a Problem
            </button>
          </section>
        </div>
      </div>
    </>
  );
}

function DeleteMyDataButton() {
  const { userId, apiKey, resetAll } = useChatStore();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/user/${userId}/data`, {
        method: 'DELETE',
        headers: getJsonHeaders(apiKey),
      });
    } catch (_) {}
    localStorage.removeItem('vidya-user-id');
    resetAll();
    setDeleting(false);
    window.location.reload();
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete My Data
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
        This permanently deletes all learning data from our servers. Cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting...' : 'Yes, delete everything'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
