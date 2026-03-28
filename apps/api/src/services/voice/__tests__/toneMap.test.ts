import { describe, it, expect } from 'vitest';
import {
  getElevenLabsSettings,
  getOpenAIInstructions,
  getAzureStyle,
} from '../toneMap';

describe('getElevenLabsSettings', () => {
  it('returns correct settings for supportive', () => {
    const s = getElevenLabsSettings({ tone: 'supportive' });
    expect(s.stability).toBe(0.40);
    expect(s.similarity_boost).toBe(0.70);
    expect(s.style).toBe(0.35);
  });

  it('returns correct settings for celebratory', () => {
    const s = getElevenLabsSettings({ tone: 'celebratory' });
    expect(s.stability).toBe(0.30);
    expect(s.style).toBe(0.50);
  });

  it('returns correct settings for patient', () => {
    const s = getElevenLabsSettings({ tone: 'patient' });
    expect(s.stability).toBe(0.55);
    expect(s.style).toBe(0.20);
  });

  it('returns correct settings for challenging', () => {
    const s = getElevenLabsSettings({ tone: 'challenging' });
    expect(s.stability).toBe(0.35);
    expect(s.style).toBe(0.40);
  });

  it('calmMode overrides tone to calm settings', () => {
    const s = getElevenLabsSettings({ tone: 'celebratory', calmMode: true });
    expect(s.stability).toBe(0.70);
    expect(s.style).toBe(0.10);
  });

  it('defaults to supportive when no options provided', () => {
    const s = getElevenLabsSettings();
    expect(s.stability).toBe(0.40);
    expect(s.style).toBe(0.35);
  });
});

describe('getOpenAIInstructions', () => {
  it('supportive instructions contain warm/gentle', () => {
    const i = getOpenAIInstructions({ tone: 'supportive' });
    expect(i.toLowerCase()).toMatch(/warm|gentle/);
  });

  it('celebratory instructions contain happy or enthusiastic', () => {
    const i = getOpenAIInstructions({ tone: 'celebratory' });
    expect(i.toLowerCase()).toMatch(/happy|joyful|enthusiastic|upbeat/);
  });

  it('patient instructions contain calm or slow', () => {
    const i = getOpenAIInstructions({ tone: 'patient' });
    expect(i.toLowerCase()).toMatch(/calm|slow/);
  });

  it('challenging instructions contain confident or upbeat', () => {
    const i = getOpenAIInstructions({ tone: 'challenging' });
    expect(i.toLowerCase()).toMatch(/confident|upbeat/);
  });

  it('calmMode instructions contain minimal and soft', () => {
    const i = getOpenAIInstructions({ calmMode: true });
    expect(i.toLowerCase()).toMatch(/minimal|soft/);
  });

  it('defaults to supportive instructions when no options', () => {
    const i = getOpenAIInstructions();
    expect(i.toLowerCase()).toMatch(/warm|gentle/);
  });
});

describe('getAzureStyle', () => {
  it('celebratory returns cheerful', () => {
    expect(getAzureStyle({ tone: 'celebratory' }).style).toBe('cheerful');
  });

  it('patient returns calm', () => {
    expect(getAzureStyle({ tone: 'patient' }).style).toBe('calm');
  });

  it('supportive returns friendly', () => {
    expect(getAzureStyle({ tone: 'supportive' }).style).toBe('friendly');
  });

  it('calmMode returns calm with low degree', () => {
    const s = getAzureStyle({ calmMode: true });
    expect(s.style).toBe('calm');
    expect(s.styleDegree).toBeLessThan(1.0);
  });

  it('defaults to supportive/friendly when no options', () => {
    expect(getAzureStyle().style).toBe('friendly');
  });
});
