require('@testing-library/jest-dom');

// Polyfill crypto.randomUUID for jsdom
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Polyfill window.matchMedia for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Polyfill window.Audio for jsdom (HTMLAudioElement has no playback in jsdom)
if (typeof window !== 'undefined') {
  global.Audio = jest.fn().mockImplementation(() => ({
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
    src: '',
    onended: null,
    onerror: null,
    load: jest.fn(),
  }));
}

// Polyfill window.speechSynthesis for jsdom
if (typeof window !== 'undefined' && !window.speechSynthesis) {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    configurable: true,
    value: {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn(() => []),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
}

// Polyfill SpeechSynthesisUtterance for jsdom
if (typeof global.SpeechSynthesisUtterance === 'undefined') {
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
    this.text = text || '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.lang = '';
  };
}

// Polyfill URL.createObjectURL / revokeObjectURL for jsdom
if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = jest.fn();
  }
}
