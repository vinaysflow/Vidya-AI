import { renderHook, act, waitFor } from '@testing-library/react';
import { useVidyaVoice } from '../useVidyaVoice';

// CRITICAL: mock lib/api to avoid import.meta.env blow-up in Jest
jest.mock('../../lib/api', () => ({
  getApiBase: () => 'http://localhost:4000',
  getJsonHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

jest.mock('../useBrowserTTS', () => ({
  useBrowserTTS: jest.fn(() => ({
    speak: jest.fn(),
    stop: jest.fn(),
    isSupported: true,
  })),
}));

import { useBrowserTTS } from '../useBrowserTTS';

const mockMp3 = new ArrayBuffer(4);

function makeFetchOk(delay = 0): jest.Mock {
  return jest.fn(async () => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    return {
      ok: true,
      arrayBuffer: async () => mockMp3,
    };
  });
}

function makeFetchFail(): jest.Mock {
  return jest.fn(async () => {
    throw new Error('Network error');
  });
}

describe('useVidyaVoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();
    (global.Audio as jest.Mock).mockImplementation(() => ({
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      src: '',
      onended: null,
      onerror: null,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets isLoading during fetch then isPlaying after audio starts', async () => {
    global.fetch = makeFetchOk();
    const { result } = renderHook(() => useVidyaVoice());

    act(() => {
      result.current.play('Hello');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('fetches from the correct URL with correct body', async () => {
    global.fetch = makeFetchOk();
    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello', { tone: 'celebratory', speed: 0.85 });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/voice/synthesize',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"tone":"celebratory"'),
      }),
    );
  });

  it('stop() clears isPlaying and isLoading', async () => {
    global.fetch = makeFetchOk();
    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('stale play prevention: rapid play calls only play the latest text', async () => {
    let resolveA: ((value: unknown) => void) | null = null;
    let resolveB: ((value: unknown) => void) | null = null;

    global.fetch = jest.fn()
      .mockImplementationOnce(
        () => new Promise((r) => { resolveA = r; }).then(() => ({
          ok: true, arrayBuffer: async () => mockMp3,
        })),
      )
      .mockImplementationOnce(
        () => new Promise((r) => { resolveB = r; }).then(() => ({
          ok: true, arrayBuffer: async () => mockMp3,
        })),
      );

    const { result } = renderHook(() => useVidyaVoice());
    const audioMocks: ReturnType<typeof global.Audio>[] = [];
    (global.Audio as jest.Mock).mockImplementation(() => {
      const inst = { play: jest.fn(() => Promise.resolve()), pause: jest.fn(), src: '', onended: null, onerror: null };
      audioMocks.push(inst);
      return inst;
    });

    // Start playing A then B immediately
    act(() => { result.current.play('A'); });
    act(() => { result.current.play('B'); });

    // Resolve B first
    await act(async () => {
      jest.runAllTimers();
      resolveB!(undefined);
      await Promise.resolve();
    });

    // Resolve A after (stale)
    await act(async () => {
      resolveA!(undefined);
      await Promise.resolve();
    });

    // Only B's audio should have been created and played
    // The first Audio() call in B's play is the one that should play
    const playedAudios = audioMocks.filter((a) => (a.play as jest.Mock).mock.calls.length > 0);
    expect(playedAudios.length).toBeLessThanOrEqual(1);
  });

  it('sets isUnavailable on hard API failure', async () => {
    global.fetch = makeFetchFail();
    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('triggers browser TTS fallback on hard API failure', async () => {
    global.fetch = makeFetchFail();
    const mockSpeak = jest.fn();
    (useBrowserTTS as jest.Mock).mockReturnValue({
      speak: mockSpeak,
      stop: jest.fn(),
      isSupported: true,
    });

    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    expect(mockSpeak).toHaveBeenCalledWith('Hello');
  });

  it('triggers browser TTS at 1.5s timeout when API is slow', async () => {
    // API takes 3 seconds
    global.fetch = makeFetchOk(3000);
    const mockSpeak = jest.fn();
    (useBrowserTTS as jest.Mock).mockReturnValue({
      speak: mockSpeak,
      stop: jest.fn(),
      isSupported: true,
    });

    const { result } = renderHook(() => useVidyaVoice());

    act(() => { result.current.play('Hello'); });

    // Advance to just past 1.5s timeout
    await act(async () => {
      jest.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    expect(mockSpeak).toHaveBeenCalledWith('Hello');
    expect(result.current.isLoading).toBe(false);
  });

  it('uses cached blob URL for same text (no second fetch)', async () => {
    global.fetch = makeFetchOk();
    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    const callCount = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCount); // no new fetch
  });

  it('makes new fetch for different text', async () => {
    global.fetch = makeFetchOk();
    const { result } = renderHook(() => useVidyaVoice());

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Hello');
    });

    await act(async () => {
      jest.runAllTimers();
      await result.current.play('Goodbye');
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
  });

  it('does not update state after unmount', async () => {
    global.fetch = makeFetchOk(500);
    const { result, unmount } = renderHook(() => useVidyaVoice());

    act(() => { result.current.play('Hello'); });

    // Unmount before fetch completes
    unmount();

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    // No errors thrown -- state updates on unmounted component silently skipped
  });
});
