/**
 * ParentSetupScreen tests.
 * Focuses on learning profile question rendering and setLearningProfile call.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParentSetupScreen } from '../ParentSetupScreen';
import { useChatStore } from '../../../stores/chatStore';

jest.mock('../../../lib/api', () => ({
  getApiBase: () => 'http://localhost:4000',
  getJsonHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

jest.mock('../../../stores/chatStore', () => {
  const actual = jest.requireActual('../../../stores/chatStore');
  return {
    ...actual,
    useChatStore: jest.fn(() => ({
      setGrade: jest.fn(),
      setEffectiveGrade: jest.fn(),
      setRsmTrack: jest.fn(),
      setInterests: jest.fn(),
      setLearningProfile: jest.fn(),
      setVoiceEnabled: jest.fn(),
      setCalmMode: jest.fn(),
      rsmTrack: null,
      grade: null,
      voiceEnabled: false,
      interests: [],
      userId: 'test-user',
      apiKey: null,
      calmMode: false,
      learningProfile: null,
    })),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <ParentSetupScreen />
    </MemoryRouter>,
  );
}

describe('ParentSetupScreen — learning profile questions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 profile question sections', () => {
    renderScreen();
    expect(screen.getByText('How does your child learn best?')).toBeTruthy();
    expect(screen.getByText('What helps your child focus?')).toBeTruthy();
    expect(screen.getByText('What subjects feel hard?')).toBeTruthy();
    expect(screen.getByText('Any accommodations at school?')).toBeTruthy();
  });

  it('renders chip options for learning style', () => {
    renderScreen();
    expect(screen.getByText('Visual')).toBeTruthy();
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(screen.getByText('Hands-on')).toBeTruthy();
  });

  it('renders accommodation options', () => {
    renderScreen();
    expect(screen.getByText('Extra time')).toBeTruthy();
    expect(screen.getByText('Read aloud')).toBeTruthy();
    expect(screen.getByText('Visual aids')).toBeTruthy();
  });

  it('chip toggles work (visual/unselected toggle)', () => {
    renderScreen();
    const visualBtn = screen.getByText('Visual').closest('button')!;
    expect(visualBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(visualBtn);
    // After click, button should be aria-pressed=true
    expect(visualBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls setLearningProfile when "Let\'s go!" is clicked with a grade selected', () => {
    const setLearningProfile = jest.fn();
    // Mock fetch for DiagnosticQuizScreen (it will render after "Let's go!")
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as any;

    (useChatStore as jest.Mock).mockReturnValue({
      setGrade: jest.fn(),
      setEffectiveGrade: jest.fn(),
      setRsmTrack: jest.fn(),
      setInterests: jest.fn(),
      setLearningProfile,
      setVoiceEnabled: jest.fn(),
      setCalmMode: jest.fn(),
      rsmTrack: null,
      grade: null,
      voiceEnabled: false,
      interests: [],
      userId: 'test-user',
      apiKey: null,
      calmMode: false,
      learningProfile: null,
    });

    renderScreen();

    // Select grade 4
    fireEvent.click(screen.getByText('Grade 4').closest('button')!);

    // Select a learning chip
    fireEvent.click(screen.getByText('Visual').closest('button')!);

    // Click Let's go!
    const letsGoBtn = screen.getByTestId('parent-lets-go');
    fireEvent.click(letsGoBtn);

    expect(setLearningProfile).toHaveBeenCalledTimes(1);
    const profile = setLearningProfile.mock.calls[0][0];
    expect(profile).toHaveProperty('learnsBestBy');
    expect(profile).toHaveProperty('focusHelpers');
    expect(profile).toHaveProperty('hardSubjects');
    expect(profile).toHaveProperty('accommodations');
    expect(profile.learnsBestBy).toContain('visual');

    global.fetch = undefined as any;
  });
});
