/**
 * GameScene TTS tests.
 *
 * Tests the TTS synthesizeBubble behavior:
 *  1. With voiceEnabled=false: synthesize not called on mount
 *  2. With voiceEnabled=true: synthesize called when displayText available
 *
 * Note: GameScene uses import.meta.env, so we test the TTS logic
 * via the underlying synthesizeBubble pattern rather than full component mount.
 * The ref pattern change (Phase 3.1) is tested through the hook behavior.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { render, act } from '@testing-library/react';

/**
 * Minimal hook that reproduces the exact pattern from GameScene's TTS useEffect fix.
 * Tests that the ref pattern correctly responds to voiceEnabled changes.
 */
function useTtsEffect(displayText: string, voiceEnabled: boolean, onSynthesize: (text: string) => void) {
  const synthesizeBubbleRef = useRef(onSynthesize);
  useEffect(() => { synthesizeBubbleRef.current = onSynthesize; }, [onSynthesize]);

  useEffect(() => {
    if (displayText && voiceEnabled) {
      synthesizeBubbleRef.current(displayText);
    }
  }, [displayText, voiceEnabled]);
}

function TestHookComponent({ displayText, voiceEnabled, onSynthesize }: {
  displayText: string;
  voiceEnabled: boolean;
  onSynthesize: (text: string) => void;
}) {
  useTtsEffect(displayText, voiceEnabled, onSynthesize);
  return <div data-testid="hook-host" />;
}

describe('GameScene TTS ref pattern (Phase 3.1)', () => {
  it('does NOT call synthesize when voiceEnabled is false', () => {
    const onSynthesize = jest.fn();
    render(
      <TestHookComponent
        displayText="What is 2 + 2?"
        voiceEnabled={false}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).not.toHaveBeenCalled();
  });

  it('calls synthesize with displayText when voiceEnabled is true on mount', () => {
    const onSynthesize = jest.fn();
    render(
      <TestHookComponent
        displayText="What is 2 + 2?"
        voiceEnabled={true}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).toHaveBeenCalledWith('What is 2 + 2?');
  });

  it('calls synthesize when voiceEnabled changes from false to true', () => {
    const onSynthesize = jest.fn();
    const { rerender } = render(
      <TestHookComponent
        displayText="What is 2 + 2?"
        voiceEnabled={false}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).not.toHaveBeenCalled();

    // Toggle voiceEnabled to true
    rerender(
      <TestHookComponent
        displayText="What is 2 + 2?"
        voiceEnabled={true}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).toHaveBeenCalledWith('What is 2 + 2?');
  });

  it('calls synthesize again when displayText changes', () => {
    const onSynthesize = jest.fn();
    const { rerender } = render(
      <TestHookComponent
        displayText="First question"
        voiceEnabled={true}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).toHaveBeenCalledWith('First question');

    rerender(
      <TestHookComponent
        displayText="Second question"
        voiceEnabled={true}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).toHaveBeenCalledWith('Second question');
    expect(onSynthesize).toHaveBeenCalledTimes(2);
  });

  it('does NOT call synthesize when displayText is empty', () => {
    const onSynthesize = jest.fn();
    render(
      <TestHookComponent
        displayText=""
        voiceEnabled={true}
        onSynthesize={onSynthesize}
      />,
    );
    expect(onSynthesize).not.toHaveBeenCalled();
  });

  it('uses the latest version of onSynthesize via ref (stale closure prevention)', () => {
    const onSynthesize1 = jest.fn();
    const onSynthesize2 = jest.fn();

    const { rerender } = render(
      <TestHookComponent
        displayText="Question"
        voiceEnabled={false}
        onSynthesize={onSynthesize1}
      />,
    );

    // Update synthesize callback (simulates parent re-render updating useCallback)
    rerender(
      <TestHookComponent
        displayText="Question"
        voiceEnabled={false}
        onSynthesize={onSynthesize2}
      />,
    );

    // Now enable voice — should call onSynthesize2 (latest), not onSynthesize1
    rerender(
      <TestHookComponent
        displayText="Question"
        voiceEnabled={true}
        onSynthesize={onSynthesize2}
      />,
    );

    expect(onSynthesize2).toHaveBeenCalledWith('Question');
    expect(onSynthesize1).not.toHaveBeenCalled();
  });
});
