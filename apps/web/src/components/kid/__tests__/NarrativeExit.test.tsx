/**
 * NarrativeExit component tests — TDD first.
 *
 * P6: Neurodiverse design — calm session end, predictable auto-dismiss,
 * tap to dismiss, no praise. Aria live region for accessibility.
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

jest.mock('../../../lib/api', () => ({
  getApiBase: () => 'http://localhost:4000',
  getJsonHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

// Mock narrativeExits so we can control the thread output
jest.mock('../../../lib/narrativeExits', () => ({
  pickExitThread: (theme: string | null) => {
    if (theme === 'space') return "The colonists' oxygen system is coming along";
    return "Something's clicking";
  },
}));

import { NarrativeExit } from '../NarrativeExit';

describe('NarrativeExit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the exit message with the theme thread', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme="space" onDismiss={onDismiss} />);

    expect(screen.getByText(/Good work today/)).toBeTruthy();
    expect(screen.getByText(/colonists/)).toBeTruthy();
    expect(screen.getByText(/See you next time/)).toBeTruthy();
  });

  it('renders "tap to dismiss" instruction', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme={null} onDismiss={onDismiss} />);
    expect(screen.getByText(/Tap to dismiss/i)).toBeTruthy();
  });

  it('has aria-live="polite" for screen reader announcement', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme="space" onDismiss={onDismiss} />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeTruthy();
  });

  it('calls onDismiss after 4 seconds', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme="space" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss on tap/click', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme="space" onDismiss={onDismiss} />);
    const overlay = screen.getByRole('status');
    fireEvent.click(overlay);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT contain praise language', () => {
    const onDismiss = jest.fn();
    render(<NarrativeExit questTheme="space" onDismiss={onDismiss} />);
    const text = document.body.textContent?.toLowerCase() ?? '';
    expect(text).not.toMatch(/great job/);
    expect(text).not.toMatch(/amazing/);
    expect(text).not.toMatch(/fantastic/);
    expect(text).not.toMatch(/awesome/);
  });
});
