/**
 * TransitionCard component tests.
 *
 * Tests:
 *  1. Renders message text
 *  2. Auto-dismisses after 2s via onDismiss
 *  3. Click/tap calls onDismiss immediately
 *  4. With calmMode=true, no slide-up animation class applied
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TransitionCard } from '../TransitionCard';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('TransitionCard', () => {
  it('renders the message text', () => {
    render(<TransitionCard message="Next: a question about fractions!" onDismiss={jest.fn()} />);
    expect(screen.getByText('Next: a question about fractions!')).toBeTruthy();
  });

  it('calls onDismiss automatically after 2000ms', () => {
    const onDismiss = jest.fn();
    render(<TransitionCard message="Next: explain your thinking!" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(2000); });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onDismiss before 2000ms', () => {
    const onDismiss = jest.fn();
    render(<TransitionCard message="Quest complete!" onDismiss={onDismiss} />);

    act(() => { jest.advanceTimersByTime(1999); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss on click/tap', () => {
    const onDismiss = jest.fn();
    const { container } = render(<TransitionCard message="Next: a question!" onDismiss={onDismiss} />);

    fireEvent.click(container.firstChild as Element);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies slide animation class by default (no calmMode)', () => {
    const { container } = render(<TransitionCard message="Next!" onDismiss={jest.fn()} />);
    expect(container.innerHTML).toContain('animate-transition-slide');
  });

  it('applies fade animation class when calmMode=true', () => {
    const { container } = render(<TransitionCard message="Next!" onDismiss={jest.fn()} calmMode={true} />);
    expect(container.innerHTML).not.toContain('animate-transition-slide');
    expect(container.innerHTML).toContain('animate-transition-fade');
  });

  it('cleans up timer on unmount to prevent memory leak', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(<TransitionCard message="Next!" onDismiss={onDismiss} />);

    unmount();
    act(() => { jest.advanceTimersByTime(2000); });

    // After unmount, onDismiss should NOT be called (timer was cleared)
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
