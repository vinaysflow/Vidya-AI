import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type Language = 'EN' | 'HI' | 'KN' | 'FR' | 'DE' | 'ES' | 'ZH';

export type Subject =
  | 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS' | 'BIOLOGY'
  | 'ESSAY_WRITING' | 'COUNSELING'
  | 'CODING' | 'ENGLISH_LITERATURE' | 'ECONOMICS'
  | 'AI_LEARNING';

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  language?: Language;
  imageUrl?: string;
  audioUrl?: string;
  metadata?: {
    questionType?: string;
    topic?: string;
    hintLevel?: number;
    distanceFromSolution?: number;
    conceptsIdentified?: string[];
    readiness?: number;
    grounding?: 'bank' | 'reasoned' | 'retrieved';
    confidence?: number;
    safetyEvents?: string[];
    modelUsed?: { provider: string; model: string; fallbackUsed: boolean };
    visualContent?: { type: string; data: any };
  };
  timestamp?: Date;
}

export interface SessionSummary {
  id: string;
  subject: Subject;
  language: Language;
  preview: string;
  messageCount: number;
  createdAt: Date;
  lastViewedAt?: Date;
  topic?: string;
}

export interface SessionReport {
  summary: string;
  conceptsEngaged: string[];
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
  messagesExchanged: number;
  durationMinutes: number;
  readinessStart?: number;
  readinessEnd?: number;
  essayFeedbackAreas?: string[];
}

export type QuizQuestionType = 'multiple_choice' | 'short_answer';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type PlanTier = 'FREE' | 'PRO';
export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  concept: string;
  difficulty: QuizDifficulty;
}

export interface SessionQuiz {
  questions: QuizQuestion[];
}

export interface LearnerState {
  subject: Subject;
  language: Language;
  updatedAt: Date;
  conceptsEngaged: string[];
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
}

export interface GamificationState {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  nextLevelXp: number;
  badges: { badge: string; earnedAt: Date }[];
  recentXp: number;
  pendingLevelUp: number | null;
}

interface ChatState {
  sessionId: string | null;
  subject: Subject;
  language: Language;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  apiKey: string | null;

  sessionHistory: SessionSummary[];
  sidebarOpen: boolean;
  settingsOpen: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  currentReport: SessionReport | null;
  learnerState: LearnerState | null;
  currentQuiz: SessionQuiz | null;
  isQuizLoading: boolean;
  learningGoal: string;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  noFinalAnswerMode: boolean;
  planTier: PlanTier;
  theme: ThemePreference;
  voiceEnabled: boolean;
  gamification: GamificationState | null;

  setLanguage: (lang: Language) => void;
  setSubject: (subject: Subject) => void;
  setApiKey: (key: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setLearningGoal: (goal: string) => void;
  setDifficultyLevel: (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => void;
  setNoFinalAnswerMode: (enabled: boolean) => void;
  setPlanTier: (tier: PlanTier) => void;
  setTheme: (theme: ThemePreference) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  completeOnboarding: () => void;
  startOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  startSession: (problem: string, problemImage?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  endSession: () => Promise<void>;
  generateQuiz: (count?: number) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => void;
  deleteSessions: (sessionIds: string[]) => void;
  clearChat: () => void;
  setError: (error: string | null) => void;
  fetchGamificationProfile: () => Promise<void>;
  onXPEarned: (xpDelta: number, leveledUp?: boolean, newLevel?: number) => void;
  dismissLevelUp: () => void;
}

// ============================================
// API
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function authHeaders(apiKey: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
  return h;
}

// ============================================
// STORE
// ============================================

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      subject: 'PHYSICS',
      language: 'EN',
      messages: [],
      isLoading: false,
      error: null,
      apiKey: null,

      sessionHistory: [],
      sidebarOpen: false,
      settingsOpen: false,
      hasCompletedOnboarding: false,
      onboardingStep: 0,
      currentReport: null,
      learnerState: null,
      currentQuiz: null,
      isQuizLoading: false,
      learningGoal: '',
      difficultyLevel: 'BEGINNER',
      noFinalAnswerMode: false,
      planTier: 'FREE',
      theme: 'SYSTEM',
      voiceEnabled: false,
      gamification: null,

      setLanguage: (language) => set({ language }),
      setSubject: (subject) => set({ subject }),
      setApiKey: (apiKey) => set({ apiKey }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setLearningGoal: (learningGoal) => set({ learningGoal }),
      setDifficultyLevel: (difficultyLevel) => set({ difficultyLevel }),
      setNoFinalAnswerMode: (noFinalAnswerMode) => set({ noFinalAnswerMode }),
      setPlanTier: (planTier) => set({ planTier }),
      setTheme: (theme) => set({ theme }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true, onboardingStep: 0 }),
      startOnboarding: () => set({ hasCompletedOnboarding: false, onboardingStep: 0 }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),

      startSession: async (problem: string, problemImage?: string) => {
        const { language, subject, apiKey, noFinalAnswerMode } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/tutor/session/start`, {
            method: 'POST',
            headers: authHeaders(apiKey),
            body: JSON.stringify({
              subject,
              language,
              problemText: problem,
              noFinalAnswer: noFinalAnswerMode,
              ...(problemImage ? { problemImage } : {})
            })
          });

          if (!response.ok) throw new Error('Failed to start session');
          const data = await response.json();

          if (data.success) {
            const msgs = data.messages.map((m: any, idx: number) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              metadata: m.metadata,
              timestamp: new Date(m.timestamp),
              ...(idx === 0 && problemImage ? { imageUrl: problemImage } : {})
            }));

            const summary: SessionSummary = {
              id: data.session.id,
              subject,
              language,
              preview: problem.slice(0, 80),
              messageCount: msgs.length,
              createdAt: new Date(),
              lastViewedAt: new Date(),
              topic: msgs[1]?.metadata?.topic,
            };

            set(state => ({
              sessionId: data.session.id,
              messages: msgs,
              isLoading: false,
              currentReport: null,
              currentQuiz: null,
              sessionHistory: [summary, ...state.sessionHistory].slice(0, 50),
            }));
          } else {
            throw new Error(data.error || 'Failed to start session');
          }
        } catch (error) {
          console.error('Start session error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to start session',
            isLoading: false,
            currentReport: null,
            currentQuiz: null,
            messages: [
              { role: 'user', content: problem, language, timestamp: new Date(), imageUrl: problemImage },
              { role: 'assistant', content: getOfflineFallback(language), language, timestamp: new Date() }
            ]
          });
        }
      },

      sendMessage: async (content: string) => {
        const { sessionId, language, messages, apiKey, noFinalAnswerMode } = get();
        const userMessage: Message = { role: 'user', content, language, timestamp: new Date() };
        set({ messages: [...messages, userMessage], isLoading: true, error: null, currentReport: null, currentQuiz: null });

        try {
          if (!sessionId) {
            await get().startSession(content);
            return;
          }

          const response = await fetch(`${API_BASE}/api/tutor/message`, {
            method: 'POST',
            headers: authHeaders(apiKey),
            body: JSON.stringify({ sessionId, message: content, language, noFinalAnswer: noFinalAnswerMode })
          });

          if (!response.ok) throw new Error('Failed to send message');
          const data = await response.json();

          if (data.success) {
            const assistantMessage: Message = {
              id: data.message.id,
              role: 'assistant',
              content: data.message.content,
              language: data.message.language,
              metadata: data.message.metadata,
              timestamp: new Date(data.message.timestamp)
            };

            set(state => {
              const updated = [...state.messages, assistantMessage];
              const history = state.sessionHistory.map(s =>
                s.id === sessionId
                  ? { ...s, messageCount: updated.length, topic: data.message.metadata?.topic || s.topic, lastViewedAt: new Date() }
                  : s
              );
              return { messages: updated, isLoading: false, sessionHistory: history, currentReport: null, currentQuiz: null };
            });

            if (data.gamification) {
              get().onXPEarned(data.gamification.xpEarned, data.gamification.leveledUp, data.gamification.newLevel);
            }
          } else {
            throw new Error(data.error || 'Failed to send message');
          }
        } catch (error) {
          console.error('Send message error:', error);
          set(state => ({
            messages: [...state.messages, { role: 'assistant', content: getOfflineFallback(language), language, timestamp: new Date() }],
            error: error instanceof Error ? error.message : 'Failed to send message',
            isLoading: false,
            currentReport: null,
            currentQuiz: null
          }));
        }
      },

      endSession: async () => {
        const { sessionId, apiKey } = get();
        if (!sessionId) return;
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/tutor/session/${sessionId}/end`, {
            method: 'POST',
            headers: authHeaders(apiKey),
          });
          if (!response.ok) throw new Error('Failed to end session');
          const data = await response.json();

          if (data.success) {
            const report = data.report as SessionReport;
            const { subject, language } = get();
            const learnerState: LearnerState = {
              subject,
              language,
              updatedAt: new Date(),
              conceptsEngaged: report.conceptsEngaged,
              strengths: report.strengths,
              areasForImprovement: report.areasForImprovement,
              nextSteps: report.nextSteps,
            };
            set({ isLoading: false, currentReport: report, learnerState, currentQuiz: null });

            if (data.gamification) {
              get().onXPEarned(data.gamification.xpEarned, data.gamification.leveledUp, data.gamification.newLevel);
              get().fetchGamificationProfile();
            }
          } else {
            throw new Error(data.error || 'Failed to end session');
          }
        } catch (error) {
          console.error('End session error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to end session',
            isLoading: false,
          });
        }
      },

      generateQuiz: async (count = 3) => {
        const { sessionId, apiKey, language } = get();
        if (!sessionId) return;
        set({ isQuizLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/tutor/session/${sessionId}/quiz`, {
            method: 'POST',
            headers: authHeaders(apiKey),
            body: JSON.stringify({ count, language }),
          });
          if (!response.ok) throw new Error('Failed to generate quiz');
          const data = await response.json();

          if (data.success) {
            set({ currentQuiz: data.quiz, isQuizLoading: false });
          } else {
            throw new Error(data.error || 'Failed to generate quiz');
          }
        } catch (error) {
          console.error('Generate quiz error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to generate quiz',
            isQuizLoading: false,
          });
        }
      },

      loadSession: async (sessionId: string) => {
        const { apiKey } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/tutor/session/${sessionId}`, {
            headers: authHeaders(apiKey),
          });
          if (!response.ok) throw new Error('Failed to load session');
          const data = await response.json();

          if (data.success) {
            const now = new Date();
            set({
              sessionId: data.session.id,
              subject: data.session.subject,
              language: data.session.language,
              messages: (data.session.messages || []).map((m: any) => ({
                id: m.id,
                role: m.role.toLowerCase(),
                content: m.content,
                metadata: m.metadata,
                timestamp: new Date(m.createdAt)
              })),
              isLoading: false,
              sidebarOpen: false,
              currentReport: null,
              currentQuiz: null,
              sessionHistory: get().sessionHistory.map(s =>
                s.id === sessionId ? { ...s, lastViewedAt: now } : s
              ),
            });
          } else {
            throw new Error(data.error || 'Failed to load session');
          }
        } catch (error) {
          console.error('Load session error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load session',
            isLoading: false
          });
        }
      },

      deleteSession: (sessionIdToDelete: string) => {
        set(state => {
          const deletingActive = state.sessionId === sessionIdToDelete;
          return {
            sessionHistory: state.sessionHistory.filter(s => s.id !== sessionIdToDelete),
            sessionId: deletingActive ? null : state.sessionId,
            messages: deletingActive ? [] : state.messages,
            error: deletingActive ? null : state.error,
            currentReport: deletingActive ? null : state.currentReport,
            currentQuiz: deletingActive ? null : state.currentQuiz,
          };
        });
      },

      deleteSessions: (sessionIds: string[]) => {
        if (sessionIds.length === 0) return;
        const toDelete = new Set(sessionIds);
        set(state => {
          const deletingActive = state.sessionId ? toDelete.has(state.sessionId) : false;
          return {
            sessionHistory: state.sessionHistory.filter(s => !toDelete.has(s.id)),
            sessionId: deletingActive ? null : state.sessionId,
            messages: deletingActive ? [] : state.messages,
            error: deletingActive ? null : state.error,
            currentReport: deletingActive ? null : state.currentReport,
            currentQuiz: deletingActive ? null : state.currentQuiz,
          };
        });
      },

      clearChat: () => set({ sessionId: null, messages: [], error: null, currentReport: null, currentQuiz: null }),
      setError: (error) => set({ error }),

      fetchGamificationProfile: async () => {
        try {
          const { apiKey } = get();
          const res = await fetch(`${API_BASE}/api/gamification/profile?userId=anonymous`, {
            headers: authHeaders(apiKey),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.success) {
            set({
              gamification: {
                xp: data.profile.xp,
                level: data.profile.level,
                currentStreak: data.profile.currentStreak,
                longestStreak: data.profile.longestStreak,
                streakFreezes: data.profile.streakFreezes,
                nextLevelXp: data.profile.nextLevelXp,
                badges: data.profile.badges,
                recentXp: 0,
                pendingLevelUp: null,
              },
            });
          }
        } catch (_) {}
      },

      onXPEarned: (xpDelta, leveledUp, newLevel) => {
        set((state) => {
          if (!state.gamification) return {};
          return {
            gamification: {
              ...state.gamification,
              xp: state.gamification.xp + xpDelta,
              level: newLevel ?? state.gamification.level,
              recentXp: xpDelta,
              pendingLevelUp: leveledUp ? (newLevel ?? state.gamification.level + 1) : null,
            },
          };
        });
      },

      dismissLevelUp: () => {
        set((state) => {
          if (!state.gamification) return {};
          return { gamification: { ...state.gamification, pendingLevelUp: null } };
        });
      },
    }),
    {
      name: 'vidya-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        subject: state.subject,
        apiKey: state.apiKey,
        sessionHistory: state.sessionHistory,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        onboardingStep: state.onboardingStep,
        learningGoal: state.learningGoal,
        difficultyLevel: state.difficultyLevel,
        learnerState: state.learnerState,
        noFinalAnswerMode: state.noFinalAnswerMode,
        planTier: state.planTier,
        theme: state.theme,
        voiceEnabled: state.voiceEnabled,
        gamification: state.gamification,
      })
    }
  )
);

// ============================================
// HELPERS
// ============================================

function getOfflineFallback(language: Language): string {
  const fallbacks: Record<Language, string> = {
    EN: "I'm having trouble connecting right now. Please check your internet connection and try again.",
    HI: "अभी connection में problem है। कृपया internet check करें और दोबारा try करें।",
    KN: "ಈಗ connection ಸಮಸ್ಯೆ ಇದೆ. ದಯವಿಟ್ಟು internet ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    FR: "Probleme de connexion. Veuillez verifier votre connexion internet.",
    DE: "Verbindungsproblem. Bitte prufen Sie Ihre Internetverbindung.",
    ES: "Problema de conexion. Por favor, compruebe su conexion a internet.",
    ZH: "连接出现问题，请检查网络连接后重试。",
  };
  return fallbacks[language] || fallbacks.EN;
}

// ============================================
// SUBJECT + LANGUAGE METADATA
// ============================================

export const LANGUAGE_META: Record<Language, { label: string; native: string; flag: string }> = {
  EN: { label: 'English', native: 'English', flag: '🇬🇧' },
  HI: { label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  KN: { label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  FR: { label: 'French', native: 'Français', flag: '🇫🇷' },
  DE: { label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  ES: { label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  ZH: { label: 'Chinese', native: '中文', flag: '🇨🇳' },
};

export type SubjectCategory = 'stem' | 'humanities' | 'skills';

export interface SubjectMeta {
  id: Subject;
  category: SubjectCategory;
  color: string;
  label: Record<Language, string>;
}

export const SUBJECT_META: SubjectMeta[] = [
  { id: 'PHYSICS', category: 'stem', color: 'from-blue-500 to-cyan-500',
    label: { EN: 'Physics', HI: 'भौतिकी', KN: 'ಭೌತಶಾಸ್ತ್ರ', FR: 'Physique', DE: 'Physik', ES: 'Fisica', ZH: '物理' } },
  { id: 'CHEMISTRY', category: 'stem', color: 'from-purple-500 to-pink-500',
    label: { EN: 'Chemistry', HI: 'रसायन', KN: 'ರಸಾಯನಶಾಸ್ತ್ರ', FR: 'Chimie', DE: 'Chemie', ES: 'Quimica', ZH: '化学' } },
  { id: 'MATHEMATICS', category: 'stem', color: 'from-orange-500 to-red-500',
    label: { EN: 'Mathematics', HI: 'गणित', KN: 'ಗಣಿತ', FR: 'Maths', DE: 'Mathematik', ES: 'Matematicas', ZH: '数学' } },
  { id: 'BIOLOGY', category: 'stem', color: 'from-green-500 to-emerald-500',
    label: { EN: 'Biology', HI: 'जीव विज्ञान', KN: 'ಜೀವಶಾಸ್ತ್ರ', FR: 'Biologie', DE: 'Biologie', ES: 'Biologia', ZH: '生物' } },
  { id: 'CODING', category: 'stem', color: 'from-sky-500 to-indigo-500',
    label: { EN: 'Coding', HI: 'कोडिंग', KN: 'ಕೋಡಿಂಗ್', FR: 'Programmation', DE: 'Programmierung', ES: 'Programacion', ZH: '编程' } },
  { id: 'AI_LEARNING', category: 'stem', color: 'from-fuchsia-500 to-violet-500',
    label: { EN: 'AI / ML', HI: 'AI / ML', KN: 'AI / ML', FR: 'IA / ML', DE: 'KI / ML', ES: 'IA / ML', ZH: 'AI / ML' } },
  { id: 'ENGLISH_LITERATURE', category: 'humanities', color: 'from-amber-500 to-yellow-500',
    label: { EN: 'Literature', HI: 'साहित्य', KN: 'ಸಾಹಿತ್ಯ', FR: 'Litterature', DE: 'Literatur', ES: 'Literatura', ZH: '文学' } },
  { id: 'ECONOMICS', category: 'humanities', color: 'from-teal-500 to-green-500',
    label: { EN: 'Economics', HI: 'अर्थशास्त्र', KN: 'ಅರ್ಥಶಾಸ್ತ್ರ', FR: 'Economie', DE: 'Wirtschaft', ES: 'Economia', ZH: '经济学' } },
  { id: 'ESSAY_WRITING', category: 'skills', color: 'from-rose-500 to-pink-500',
    label: { EN: 'Essay Writing', HI: 'निबंध लेखन', KN: 'ಪ್ರಬಂಧ ಬರೆಹ', FR: 'Redaction', DE: 'Aufsatz', ES: 'Ensayo', ZH: '写作' } },
  { id: 'COUNSELING', category: 'skills', color: 'from-violet-500 to-purple-500',
    label: { EN: 'Counseling', HI: 'परामर्श', KN: 'ಸಮಾಲೋಚನೆ', FR: 'Conseil', DE: 'Beratung', ES: 'Orientacion', ZH: '咨询' } },
];

export const CATEGORY_LABELS: Record<SubjectCategory, Record<Language, string>> = {
  stem: { EN: 'Science & Tech', HI: 'विज्ञान', KN: 'ವಿಜ್ಞಾನ', FR: 'Sciences', DE: 'Wissenschaft', ES: 'Ciencias', ZH: '理科' },
  humanities: { EN: 'Humanities', HI: 'मानविकी', KN: 'ಮಾನವಿಕ', FR: 'Lettres', DE: 'Geisteswiss.', ES: 'Humanidades', ZH: '文科' },
  skills: { EN: 'Skills', HI: 'कौशल', KN: 'ಕೌಶಲ', FR: 'Competences', DE: 'Kompetenzen', ES: 'Habilidades', ZH: '技能' },
};
