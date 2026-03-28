/**
 * DiagnosticQuizScreen component tests.
 *
 * Core assertions (stealth assessment design):
 *  1. No correct/incorrect color signals shown after a pick (no emerald, no red)
 *  2. No CheckCircle or XCircle icons rendered
 *  3. Progress dots are neutral (no conditional green/red)
 *  4. onComplete still receives the full { correct } result data (backend unaffected)
 *  5. Auto-advances to next question after 800ms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DiagnosticQuizScreen } from '../DiagnosticQuizScreen';
import { useChatStore } from '../../../stores/chatStore';

// Mock useVidyaVoice so we can track play calls
jest.mock('../../../hooks/useVidyaVoice', () => ({
  useVidyaVoice: jest.fn(() => ({
    play: jest.fn(),
    stop: jest.fn(),
    isPlaying: false,
    isLoading: false,
    isUnavailable: false,
  })),
}));

import { useVidyaVoice } from '../../../hooks/useVidyaVoice';

// -- Mock the chatStore minimally ---
jest.mock('../../../stores/chatStore', () => ({
  useChatStore: jest.fn(() => ({
    apiKey: 'test-key',
    calmMode: false,
    voiceEnabled: false,
    language: 'EN',
  })),
}));

// -- Mock lib/api --
jest.mock('../../../lib/api', () => ({
  getApiBase: () => 'http://localhost:4000',
  getJsonHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

function getPlayMock() {
  return (useVidyaVoice as jest.Mock).mock.results[
    (useVidyaVoice as jest.Mock).mock.results.length - 1
  ]?.value?.play as jest.Mock;
}

const MOCK_QUIZ = [
  {
    id: 'q1',
    conceptKey: 'addition_basic',
    gradeLevel: 3,
    subject: 'MATHEMATICS',
    questionText: 'What is 2 + 2?',
    answerFormula: '4',
    distractors: ['3', '5'],
  },
  {
    id: 'q2',
    conceptKey: 'subtraction_basic',
    gradeLevel: 4,
    subject: 'MATHEMATICS',
    questionText: 'What is 10 - 3?',
    answerFormula: '7',
    distractors: ['6', '8'],
  },
];

function mockFetchWithQuiz() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, quiz: MOCK_QUIZ }),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  global.fetch = undefined as any;
});

async function renderQuiz(onComplete = jest.fn(), onSkip = jest.fn()) {
  mockFetchWithQuiz();
  const result = render(
    <DiagnosticQuizScreen
      grade={4}
      subject="MATHEMATICS"
      onComplete={onComplete}
      onSkip={onSkip}
    />,
  );
  // Wait for the fetch to resolve and quiz to load
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe('DiagnosticQuizScreen — stealth assessment', () => {
  it('loads and renders the first question', async () => {
    await renderQuiz();
    expect(screen.getByText('What is 2 + 2?')).toBeTruthy();
  });

  it('shows answer choices', async () => {
    await renderQuiz();
    // All 3 choices should be visible (order is random but all present)
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does NOT show green/emerald styling after picking correct answer', async () => {
    const { container } = await renderQuiz();

    const correctBtn = screen.getByText('4').closest('button')!;
    fireEvent.click(correctBtn);

    // Wait for any state updates
    await act(async () => { await Promise.resolve(); });

    // No emerald color classes anywhere in the container
    expect(container.innerHTML).not.toMatch(/bg-emerald|border-emerald|text-emerald/);
  });

  it('does NOT show red styling after picking wrong answer', async () => {
    const { container } = await renderQuiz();

    const wrongBtn = screen.getByText('3').closest('button')!;
    fireEvent.click(wrongBtn);

    await act(async () => { await Promise.resolve(); });

    // No red color classes for correctness feedback
    expect(container.innerHTML).not.toMatch(/bg-red|border-red-3|text-red-7/);
  });

  it('does NOT render CheckCircle or XCircle icons after picking', async () => {
    const { container } = await renderQuiz();

    fireEvent.click(screen.getByText('4').closest('button')!);
    await act(async () => { await Promise.resolve(); });

    // No lucide check-circle or x-circle SVG paths
    const svgElements = container.querySelectorAll('svg');
    // The MapIcon in the header may exist, but no check/x in choice buttons
    const choiceButtons = container.querySelectorAll('button[disabled]');
    choiceButtons.forEach((btn) => {
      // After reveal, disabled buttons should not contain check/x icons
      const innerHTML = btn.innerHTML;
      // CheckCircle renders with specific data-testid or class - ensure none present
      expect(innerHTML).not.toContain('check-circle');
      expect(innerHTML).not.toContain('x-circle');
    });
  });

  it('does NOT show correct/incorrect emoji (✅/❌) in progress map', async () => {
    const { container } = await renderQuiz();

    fireEvent.click(screen.getByText('4').closest('button')!);
    await act(async () => { await Promise.resolve(); });

    expect(container.innerHTML).not.toContain('✅');
    expect(container.innerHTML).not.toContain('❌');
  });

  it('advances to next question after 800ms delay', async () => {
    await renderQuiz();

    fireEvent.click(screen.getByText('4').closest('button')!);

    // Before timer fires
    expect(screen.queryByText('What is 10 - 3?')).toBeNull();

    // Advance timers by 800ms
    act(() => { jest.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(screen.getByText('What is 10 - 3?')).toBeTruthy();
    });
  });

  it('calls onComplete with correct result data including correct boolean', async () => {
    const onComplete = jest.fn();
    await renderQuiz(onComplete);

    // Answer Q1 correctly
    fireEvent.click(screen.getByText('4').closest('button')!);
    act(() => { jest.advanceTimersByTime(800); });
    await waitFor(() => screen.getByText('What is 10 - 3?'));

    // Answer Q2 incorrectly
    fireEvent.click(screen.getByText('6').closest('button')!);
    act(() => { jest.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    const [score, suggestedGrade, results] = onComplete.mock.calls[0];
    expect(score).toBe(1); // 1 correct out of 2
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ conceptKey: 'addition_basic', correct: true });
    expect(results[1]).toMatchObject({ conceptKey: 'subtraction_basic', correct: false });
  });

  it('shows loading state while fetching quiz', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as any; // never resolves
    render(
      <DiagnosticQuizScreen grade={4} subject="MATHEMATICS" onComplete={jest.fn()} onSkip={jest.fn()} />,
    );
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('shows skip link', async () => {
    await renderQuiz();
    expect(screen.getByText(/skip/i)).toBeTruthy();
  });
});

describe('DiagnosticQuizScreen — voice behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useVidyaVoice as jest.Mock).mockReturnValue({
      play: jest.fn(),
      stop: jest.fn(),
      isPlaying: false,
      isLoading: false,
      isUnavailable: false,
    });
  });

  it('does NOT call play when voiceEnabled is false', async () => {
    (useChatStore as jest.Mock).mockReturnValue({
      apiKey: 'test-key', calmMode: false, voiceEnabled: false, language: 'EN',
    });
    await renderQuiz();
    expect(getPlayMock()).not.toHaveBeenCalled();
  });

  it('calls play with first question text when voiceEnabled is true', async () => {
    (useChatStore as jest.Mock).mockReturnValue({
      apiKey: 'test-key', calmMode: false, voiceEnabled: true, language: 'EN',
    });
    await renderQuiz();
    expect(getPlayMock()).toHaveBeenCalledWith(
      'What is 2 + 2?',
      expect.objectContaining({ tone: 'supportive', speed: 0.85 }),
    );
  });

  it('calls play with next question text after answering', async () => {
    (useChatStore as jest.Mock).mockReturnValue({
      apiKey: 'test-key', calmMode: false, voiceEnabled: true, language: 'EN',
    });
    await renderQuiz();

    // Answer first question
    fireEvent.click(screen.getByText('4').closest('button')!);
    act(() => { jest.advanceTimersByTime(800); });

    await waitFor(() => {
      expect(getPlayMock()).toHaveBeenCalledWith(
        'What is 10 - 3?',
        expect.any(Object),
      );
    });
  });
});
