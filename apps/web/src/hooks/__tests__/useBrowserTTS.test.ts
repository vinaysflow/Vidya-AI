import { renderHook, act } from '@testing-library/react';
import { useBrowserTTS } from '../useBrowserTTS';

describe('useBrowserTTS', () => {
  const defaultSpeechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure speechSynthesis is always present and freshly mocked
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        getVoices: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('isSupported is true when speechSynthesis is in window', () => {
    const { result } = renderHook(() => useBrowserTTS());
    expect(result.current.isSupported).toBe(true);
  });

  it('isSupported is false when speechSynthesis is missing', () => {
    const original = window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, writable: true, configurable: true });
    const { result } = renderHook(() => useBrowserTTS());
    expect(result.current.isSupported).toBe(false);
    Object.defineProperty(window, 'speechSynthesis', { value: original, writable: true, configurable: true });
  });

  it('speak() calls speechSynthesis.speak with correct rate and pitch', () => {
    const { result } = renderHook(() => useBrowserTTS());
    act(() => {
      result.current.speak('Hello Vidya');
    });
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = (window.speechSynthesis.speak as jest.Mock).mock.calls[0][0];
    expect(utterance.rate).toBe(0.85);
    expect(utterance.pitch).toBe(1.05);
    expect(utterance.text).toBe('Hello Vidya');
  });

  it('stop() calls speechSynthesis.cancel', () => {
    const { result } = renderHook(() => useBrowserTTS());
    act(() => {
      result.current.stop();
    });
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
  });

  it('speak() is a no-op and does not throw when speechSynthesis is missing', () => {
    const original = window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, writable: true, configurable: true });
    const { result } = renderHook(() => useBrowserTTS());
    expect(() => {
      act(() => { result.current.speak('Hello'); });
    }).not.toThrow();
    Object.defineProperty(window, 'speechSynthesis', { value: original, writable: true, configurable: true });
  });

  it('listens for voiceschanged event when getVoices returns empty', () => {
    renderHook(() => useBrowserTTS());
    expect(window.speechSynthesis.addEventListener).toHaveBeenCalledWith(
      'voiceschanged',
      expect.any(Function),
    );
  });

  it('selects preferred voice after voiceschanged fires', () => {
    const mockVoices = [
      { name: 'Google US English', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Other Voice', lang: 'en-GB' } as SpeechSynthesisVoice,
    ];

    let voicesChangedHandler: (() => void) | null = null;
    (window.speechSynthesis.addEventListener as jest.Mock).mockImplementation(
      (event: string, handler: () => void) => {
        if (event === 'voiceschanged') voicesChangedHandler = handler;
      },
    );
    (window.speechSynthesis.getVoices as jest.Mock)
      .mockReturnValueOnce([]) // first call returns empty
      .mockReturnValue(mockVoices); // subsequent calls return voices

    const { result } = renderHook(() => useBrowserTTS());

    act(() => {
      voicesChangedHandler?.();
    });

    // After voiceschanged, speaking should use selected voice
    act(() => { result.current.speak('Test'); });
    const utterance = (window.speechSynthesis.speak as jest.Mock).mock.calls[0][0];
    expect(utterance.voice).toEqual(mockVoices[0]);
  });
});
