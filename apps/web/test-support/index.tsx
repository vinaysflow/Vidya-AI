/**
 * Shared test utilities for the Vidya web app.
 *
 * Conventions:
 *  - Import from '@/test-utils' in component tests
 *  - All helpers auto-cleanup in afterEach when used (via Jest lifecycle)
 *  - Never import these in production code
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';

// ── Re-export everything from @testing-library/react for convenience ──────────
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyFn = (...args: any[]) => any;

export type MockFetchConfig = {
  [urlSubstring: string]: {
    ok?: boolean;
    status?: number;
    body?: any;
    blob?: Blob;
  };
};

// ── mockFetch ─────────────────────────────────────────────────────────────────
/**
 * Replaces global.fetch with a jest.fn() that matches requests by URL substring.
 * Call inside beforeEach or at the start of a test.
 * Returns the mock fn so you can inspect calls.
 *
 * @example
 *   const fetch = mockFetch({
 *     '/api/game/diagnostic-quiz': { ok: true, body: { success: true, quiz: [] } },
 *   });
 *   expect(fetch).toHaveBeenCalledWith(expect.stringContaining('diagnostic-quiz'), ...);
 */
export function mockFetch(config: MockFetchConfig = {}): jest.Mock {
  const mockFn = jest.fn((url: string, _opts?: RequestInit) => {
    const matchKey = Object.keys(config).find((k) => url.includes(k));
    const cfg = matchKey ? config[matchKey] : undefined;

    if (cfg?.blob) {
      return Promise.resolve({
        ok: cfg.ok ?? true,
        status: cfg.status ?? 200,
        blob: () => Promise.resolve(cfg.blob),
        json: () => Promise.resolve({}),
      });
    }

    return Promise.resolve({
      ok: cfg?.ok ?? true,
      status: cfg?.status ?? 200,
      json: () => Promise.resolve(cfg?.body ?? {}),
      blob: () => Promise.resolve(new Blob()),
    });
  });

  global.fetch = mockFn as any;

  // Auto-reset after each test
  afterEach(() => {
    global.fetch = undefined as any;
  });

  return mockFn;
}

// ── renderWithStore ───────────────────────────────────────────────────────────
/**
 * Renders a component with a pre-seeded Zustand store and MemoryRouter.
 * Uses Zustand v4's setState escape hatch to set initial state without
 * triggering persistence side effects.
 *
 * @example
 *   renderWithStore(<MyComponent />, { voiceEnabled: true, grade: 4 });
 */
export function renderWithStore(
  ui: React.ReactElement,
  initialState: Partial<ReturnType<typeof useChatStore.getState>> = {},
  renderOptions: Omit<RenderOptions, 'wrapper'> = {},
) {
  // Seed the store with initial state
  if (Object.keys(initialState).length > 0) {
    useChatStore.setState(initialState as any);
  }

  // Reset store after test to avoid state bleed
  afterEach(() => {
    useChatStore.setState({
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
      voiceEnabled: true,
      grade: null,
      effectiveGrade: null,
    } as any);
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ── fakeTimers ────────────────────────────────────────────────────────────────
/**
 * Installs Jest fake timers and registers cleanup.
 * Call inside a describe block or at the top of a test file.
 *
 * @example
 *   beforeEach(() => fakeTimers());
 *   it('auto-dismisses after 2s', () => {
 *     render(<TransitionCard ... />);
 *     jest.advanceTimersByTime(2000);
 *     expect(onDismiss).toHaveBeenCalled();
 *   });
 */
export function fakeTimers() {
  jest.useFakeTimers();
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
}
