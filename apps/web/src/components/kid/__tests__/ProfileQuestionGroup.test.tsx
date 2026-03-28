/**
 * ProfileQuestionGroup component tests.
 * Tests chip-select multi-toggle behavior.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileQuestionGroup } from '../ProfileQuestionGroup';

const OPTIONS = [
  { id: 'visual', label: 'Visual', emoji: '👁️' },
  { id: 'listening', label: 'Listening', emoji: '👂' },
  { id: 'hands-on', label: 'Hands-on', emoji: '🤲' },
];

describe('ProfileQuestionGroup', () => {
  it('renders the label and all options', () => {
    const onToggle = jest.fn();
    render(
      <ProfileQuestionGroup
        label="How does your child learn best?"
        options={OPTIONS}
        selected={[]}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByText('How does your child learn best?')).toBeTruthy();
    expect(screen.getByText('Visual')).toBeTruthy();
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(screen.getByText('Hands-on')).toBeTruthy();
  });

  it('calls onToggle with option id when clicked', () => {
    const onToggle = jest.fn();
    render(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={[]}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText('Visual').closest('button')!);
    expect(onToggle).toHaveBeenCalledWith('visual');
  });

  it('shows selected option with active styling (aria-pressed)', () => {
    render(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={['visual']}
        onToggle={jest.fn()}
      />,
    );
    const visualBtn = screen.getByText('Visual').closest('button')!;
    expect(visualBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows unselected options with inactive styling', () => {
    render(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={['visual']}
        onToggle={jest.fn()}
      />,
    );
    const listeningBtn = screen.getByText('Listening').closest('button')!;
    expect(listeningBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports multi-select: multiple options can be selected', () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={['visual']}
        onToggle={onToggle}
      />,
    );

    // Select second option
    fireEvent.click(screen.getByText('Listening').closest('button')!);
    expect(onToggle).toHaveBeenCalledWith('listening');

    // Simulate parent updating selection
    rerender(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={['visual', 'listening']}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText('Visual').closest('button')!.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Listening').closest('button')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders emoji for each option', () => {
    const { container } = render(
      <ProfileQuestionGroup
        label="Test"
        options={OPTIONS}
        selected={[]}
        onToggle={jest.fn()}
      />,
    );
    expect(container.innerHTML).toContain('👁️');
    expect(container.innerHTML).toContain('👂');
    expect(container.innerHTML).toContain('🤲');
  });
});
