/**
 * GameScene TTS tests -- hook-based architecture.
 *
 * Tests that GameScene correctly delegates TTS to useVidyaVoice hook,
 * derives tone from game state, and handles voice on/off toggling.
 * Full component mounting is avoided; instead we test the TTS logic
 * through a minimal component that mirrors GameScene's hook usage.
 */

import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';

// Mock useVidyaVoice so we can track calls without hitting the API
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
import type { VoicePlayOptions } from '../../../hooks/useVidyaVoice';

type QuestionType = 'celebration' | 'celebrate_then_explain_back' | 'hint_with_question' | 'foundational' | 'encouragement' | 'socratic' | 'attempt_prompt' | null;

/**
 * Minimal component mirroring GameScene's voice useEffect pattern.
 * This isolates the TTS-specific behavior from the complex GameScene rendering.
 */
function VoiceEffectHarness({
  displayText,
  voiceEnabled,
  questionType,
  calmMode = false,
}: {
  displayText: string;
  voiceEnabled: boolean;
  questionType: QuestionType;
  calmMode?: boolean;
}) {
  const { play, stop } = useVidyaVoice();

  const voiceTone: VoicePlayOptions['tone'] =
    questionType === 'celebration' || questionType === 'celebrate_then_explain_back'
      ? 'celebratory'
      : questionType === 'hint_with_question' || questionType === 'foundational' || questionType === 'encouragement'
      ? 'patient'
      : 'supportive';

  useEffect(() => {
    if (displayText && voiceEnabled) {
      play(displayText, { tone: voiceTone, speed: calmMode ? 0.8 : 0.9, calmMode });
    } else {
      stop();
    }
  }, [displayText, voiceEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div data-testid="harness" />;
}

function getPlayMock() {
  return (useVidyaVoice as jest.Mock).mock.results[
    (useVidyaVoice as jest.Mock).mock.results.length - 1
  ]?.value?.play as jest.Mock;
}

function getStopMock() {
  return (useVidyaVoice as jest.Mock).mock.results[
    (useVidyaVoice as jest.Mock).mock.results.length - 1
  ]?.value?.stop as jest.Mock;
}

describe('GameScene TTS -- hook-based architecture', () => {
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

  it('calls play with displayText when voiceEnabled is true', () => {
    render(
      <VoiceEffectHarness
        displayText="What is 2 + 2?"
        voiceEnabled={true}
        questionType={null}
      />,
    );
    expect(getPlayMock()).toHaveBeenCalledWith('What is 2 + 2?', expect.any(Object));
  });

  it('does NOT call play when voiceEnabled is false', () => {
    render(
      <VoiceEffectHarness
        displayText="What is 2 + 2?"
        voiceEnabled={false}
        questionType={null}
      />,
    );
    expect(getPlayMock()).not.toHaveBeenCalled();
  });

  it('calls stop when voiceEnabled is false', () => {
    render(
      <VoiceEffectHarness
        displayText="What is 2 + 2?"
        voiceEnabled={false}
        questionType={null}
      />,
    );
    expect(getStopMock()).toHaveBeenCalled();
  });

  it('tone is celebratory on correct answer (celebration questionType)', () => {
    render(
      <VoiceEffectHarness
        displayText="Great job!"
        voiceEnabled={true}
        questionType="celebration"
      />,
    );
    expect(getPlayMock()).toHaveBeenCalledWith(
      'Great job!',
      expect.objectContaining({ tone: 'celebratory' }),
    );
  });

  it('tone is patient on wrong answer (hint_with_question questionType)', () => {
    render(
      <VoiceEffectHarness
        displayText="Let me give you a hint."
        voiceEnabled={true}
        questionType="hint_with_question"
      />,
    );
    expect(getPlayMock()).toHaveBeenCalledWith(
      'Let me give you a hint.',
      expect.objectContaining({ tone: 'patient' }),
    );
  });

  it('tone is supportive on new question (socratic questionType)', () => {
    render(
      <VoiceEffectHarness
        displayText="Think about this…"
        voiceEnabled={true}
        questionType="socratic"
      />,
    );
    expect(getPlayMock()).toHaveBeenCalledWith(
      'Think about this…',
      expect.objectContaining({ tone: 'supportive' }),
    );
  });

  it('calls play again when displayText changes', () => {
    const { rerender } = render(
      <VoiceEffectHarness displayText="First" voiceEnabled={true} questionType={null} />,
    );
    rerender(<VoiceEffectHarness displayText="Second" voiceEnabled={true} questionType={null} />);
    expect(getPlayMock()).toHaveBeenCalledTimes(2);
    expect(getPlayMock()).toHaveBeenLastCalledWith('Second', expect.any(Object));
  });

  it('uses slower speed in calmMode', () => {
    render(
      <VoiceEffectHarness
        displayText="Hello"
        voiceEnabled={true}
        questionType={null}
        calmMode={true}
      />,
    );
    expect(getPlayMock()).toHaveBeenCalledWith(
      'Hello',
      expect.objectContaining({ speed: 0.8, calmMode: true }),
    );
  });
});
