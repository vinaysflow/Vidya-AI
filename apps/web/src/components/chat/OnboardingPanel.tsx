import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { LANGUAGE_META, SUBJECT_META, useChatStore } from '../../stores/chatStore';

export function OnboardingPanel() {
  const { t } = useTranslation();
  const {
    subject,
    language,
    learningGoal,
    difficultyLevel,
    onboardingStep,
    setSubject,
    setLanguage,
    setLearningGoal,
    setDifficultyLevel,
    completeOnboarding,
    setOnboardingStep,
  } = useChatStore();

  const totalSteps = 4;
  const stepIndex = Math.min(Math.max(onboardingStep, 0), totalSteps - 1);

  const stepTitle = [
    t('onboarding.subjectTitle'),
    t('onboarding.languageTitle'),
    t('onboarding.goalTitle'),
    t('onboarding.difficultyTitle'),
  ][stepIndex];

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setOnboardingStep(stepIndex + 1);
      return;
    }
    completeOnboarding();
  };

  const handleBack = () => {
    if (stepIndex > 0) setOnboardingStep(stepIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {t('onboarding.welcome')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t('onboarding.stepLabel', { current: stepIndex + 1, total: totalSteps })}
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">
            {stepTitle}
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {stepIndex === 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t('onboarding.subjectTitle')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBJECT_META.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubject(s.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-semibold border',
                    subject === s.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  )}
                >
                  {s.label[language] || s.label.EN}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t('onboarding.languageTitle')}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANGUAGE_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setLanguage(key as keyof typeof LANGUAGE_META)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    language === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  )}
                >
                  {meta.flag} {meta.native}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t('onboarding.goalTitle')}
            </div>
            <input
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              placeholder={t('onboarding.goalPlaceholder')}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
            />
          </div>
        )}

        {stepIndex === 3 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t('onboarding.difficultyTitle')}
            </div>
            <div className="flex gap-2">
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyLevel(level)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    difficultyLevel === level
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  )}
                >
                  {level.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={completeOnboarding}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            {t('onboarding.skip')}
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              >
                {t('onboarding.back')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {stepIndex === totalSteps - 1 ? t('onboarding.finish') : t('onboarding.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
