/**
 * ChatInterface gamification visibility tests — kid path design cleanup.
 *
 * Asserts the clean conditional-not-render pattern (plan enforcement note, 1A):
 * XPBar, StreakBanner, and LevelUpModal must NOT appear in the kid-path
 * render tree when kidModeEnabled=true. They MUST still appear in adult path.
 *
 * P5: No evaluated posture for child. Gamification metrics belong on the
 * parent dashboard, not in the child's view.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../../lib/api', () => ({
  getApiBase: () => 'http://localhost:4000',
  getJsonHeaders: () => ({ 'Content-Type': 'application/json' }),
  getAuthHeader: () => ({}),
}));

jest.mock('../../../lib/featureFlags', () => ({
  FEATURE_FREEZE: false,
  VOICE_ENABLED: false,
}));

// Mock heavy/complex child components — keeps test focused on ChatInterface header logic
jest.mock('../../kid/GameScene', () => ({ GameScene: () => <div data-testid="game-scene-mock" /> }));
jest.mock('../Message', () => ({ Message: () => <div /> }));
jest.mock('../WelcomeScreen', () => ({ WelcomeScreen: () => <div data-testid="welcome-screen-mock" /> }));
jest.mock('../Sidebar', () => ({ Sidebar: () => <div /> }));
jest.mock('../SettingsPanel', () => ({ SettingsPanel: () => <div /> }));
jest.mock('../SessionSummaryCard', () => ({ SessionSummaryCard: () => <div /> }));
jest.mock('../OnboardingPanel', () => ({ OnboardingPanel: () => <div /> }));
jest.mock('../LearnerInsightsCard', () => ({ LearnerInsightsCard: () => <div /> }));
jest.mock('../SessionQuizCard', () => ({ SessionQuizCard: () => <div /> }));
jest.mock('../../kid/ParentSetupScreen', () => ({ ParentSetupScreen: () => <div /> }));
jest.mock('../../kid/RoleSelectorScreen', () => ({ RoleSelectorScreen: () => <div data-testid="role-selector-mock" /> }));
jest.mock('../../avatar/AvatarReactions', () => ({ AvatarReactions: () => <div /> }));
jest.mock('../../whiteboard/StudentCanvas', () => ({ StudentCanvas: () => <div /> }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { changeLanguage: jest.fn(), language: 'en' },
  }),
}));

jest.mock('../../../stores/chatStore', () => {
  const actual = jest.requireActual('../../../stores/chatStore');
  return {
    ...actual,
    useChatStore: jest.fn(),
    useIsKidMode: jest.fn(),
    SUBJECT_META: actual.SUBJECT_META,
    LANGUAGE_META: actual.LANGUAGE_META,
  };
});

// ── Imports after mocks ──────────────────────────────────────────────────────

import { useChatStore, useIsKidMode } from '../../../stores/chatStore';
import { ChatInterface } from '../ChatInterface';

const mockUseIsKidMode = useIsKidMode as jest.Mock;
const mockUseChatStore = useChatStore as jest.Mock;

// jsdom doesn't implement scrollIntoView — polyfill for ChatInterface's useEffect
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

function buildGamification(overrides: Record<string, unknown> = {}) {
  return {
    xp: 150,
    level: 2,
    nextLevelXp: 200,
    recentXp: 10,
    currentStreak: 3,
    streakFreezes: 1,
    badges: [],
    pendingLevelUp: null,
    ...overrides,
  };
}

// Returns the full ChatInterface store shape. useChatStore() is called without
// a selector in ChatInterface — it destructures directly.
function buildStore(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    sessionId: null,
    isLoading: false,
    kidModeEnabled: null,
    grade: null,
    effectiveGrade: null,
    gamification: null,
    currentReport: null,
    language: 'EN',
    subject: 'MATHEMATICS',
    parentViewEnabled: false,
    activeQuest: null,
    scenePhase: 'playing',
    sceneImageUrl: null,
    theme: 'SYSTEM',
    voiceEnabled: false,
    calmMode: false,
    pendingWarmUp: null,
    lastParentInsight: null,
    apiKey: null,
    userId: 'anonymous',
    rsmTrack: null,
    interests: [],
    learningProfile: null,
    planTier: 'FREE',
    noFinalAnswerMode: false,
    currentQuiz: null,
    streakCombo: 0,
    lastChoiceCorrect: null,
    sidebarOpen: false,
    hasCompletedOnboarding: true,
    learnerState: null,
    isQuizLoading: false,
    sessions: [],
    sendMessage: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn(),
    clearChat: jest.fn(),
    loadSession: jest.fn(),
    setSidebarOpen: jest.fn(),
    setSettingsOpen: jest.fn(),
    setSubject: jest.fn(),
    setLanguage: jest.fn(),
    setQuestConceptKey: jest.fn(),
    setKidModeEnabled: jest.fn(),
    setParentViewEnabled: jest.fn(),
    setSceneImageUrl: jest.fn(),
    setScenePhase: jest.fn(),
    setLastChoiceCorrect: jest.fn(),
    incrementCombo: jest.fn(),
    resetCombo: jest.fn(),
    fetchGamificationProfile: jest.fn(),
    fetchProfileAndMastery: jest.fn(),
    dismissLevelUp: jest.fn(),
    clearGamificationAnimations: jest.fn(),
    generateQuiz: jest.fn(),
    ...overrides,
  };
}

function renderChat() {
  return render(
    <MemoryRouter>
      <ChatInterface />
    </MemoryRouter>,
  );
}

describe('ChatInterface — gamification hidden in kid path (P5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT render XPBar (level/XP text) in kid path', () => {
    mockUseIsKidMode.mockReturnValue(true);
    mockUseChatStore.mockReturnValue(
      buildStore({ kidModeEnabled: true, grade: 4, gamification: buildGamification() }),
    );

    renderChat();

    // XPBar renders "Lv N" and "NNN/200 XP"
    expect(screen.queryByText(/Lv \d/)).toBeNull();
    expect(screen.queryByText(/\d+\/\d+ XP/)).toBeNull();
  });

  it('does NOT render StreakBanner (day streak text) in kid path', () => {
    mockUseIsKidMode.mockReturnValue(true);
    mockUseChatStore.mockReturnValue(
      buildStore({ kidModeEnabled: true, grade: 4, gamification: buildGamification({ currentStreak: 5 }) }),
    );

    renderChat();

    // StreakBanner renders "N day streak"
    expect(screen.queryByText(/day streak/)).toBeNull();
  });

  it('does NOT render LevelUpModal even when pendingLevelUp is set in kid path', () => {
    mockUseIsKidMode.mockReturnValue(true);
    mockUseChatStore.mockReturnValue(
      buildStore({
        kidModeEnabled: true,
        grade: 4,
        gamification: buildGamification({ pendingLevelUp: 3 }),
      }),
    );

    renderChat();

    // LevelUpModal renders "Level N!" or "You reached Level N!"
    expect(screen.queryByText(/Level \d/i)).toBeNull();
  });

  it('DOES render XPBar in adult path — regression check', () => {
    mockUseIsKidMode.mockReturnValue(false);
    mockUseChatStore.mockReturnValue(
      buildStore({
        kidModeEnabled: false,
        grade: 11,
        gamification: buildGamification({ xp: 150, level: 2 }),
        messages: [{ id: '1', role: 'user', content: 'hello', timestamp: new Date(), metadata: {} }],
        sessionId: 'sess-1',
      }),
    );

    renderChat();

    expect(screen.getByText(/Lv \d/)).toBeTruthy();
  });

  it('DOES render StreakBanner in adult path — regression check', () => {
    mockUseIsKidMode.mockReturnValue(false);
    mockUseChatStore.mockReturnValue(
      buildStore({
        kidModeEnabled: false,
        grade: 11,
        gamification: buildGamification({ currentStreak: 5 }),
        messages: [{ id: '1', role: 'user', content: 'hello', timestamp: new Date(), metadata: {} }],
        sessionId: 'sess-1',
      }),
    );

    renderChat();

    expect(screen.getByText(/5 day streak/)).toBeTruthy();
  });
});
