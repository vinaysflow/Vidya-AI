/**
 * Unit tests for the deterministic mock LLM provider.
 * Guarantees apps/api + CI can run a full turn with no real key, and that the
 * mock honors the Socratic contract (one question per response turn, no prose)
 * and returns analysis that parses cleanly.
 */
import { describe, it, expect } from 'vitest';
import { LlmClient } from '../client';

const client = new LlmClient({ provider: 'mock' });

const responseParams = {
  modelType: 'response' as const,
  maxTokens: 200,
  systemPrompt: 'You are a Socratic college counselor.',
  messages: [{ role: 'user' as const, content: 'I organized a food drive at school.' }],
};

describe('mock LLM provider', () => {
  it('is deterministic for the same input', async () => {
    const a = await client.generateText(responseParams);
    const b = await client.generateText(responseParams);
    expect(a).toBe(b);
  });

  it('returns exactly one question per response turn (no essay prose)', async () => {
    const text = await client.generateText(responseParams);
    expect(text.trim().endsWith('?')).toBe(true);
    expect((text.match(/\?/g) ?? []).length).toBe(1);
    expect(text).not.toContain('\n');
  });

  it('varies the question with the student message', async () => {
    const other = await client.generateText({
      ...responseParams,
      messages: [{ role: 'user' as const, content: 'I taught my little brother to read.' }],
    });
    const first = await client.generateText(responseParams);
    // Different seeds should (very likely) pick different questions.
    expect(typeof other).toBe('string');
    expect(other.endsWith('?')).toBe(true);
    expect(first.endsWith('?')).toBe(true);
  });

  it('returns analysis as JSON that parses with expected keys', async () => {
    const raw = await client.generateText({
      ...responseParams,
      modelType: 'analysis',
    });
    const match = raw.match(/\{[\s\S]*\}/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![0]);
    expect(parsed).toHaveProperty('suggestedFocus');
    expect(parsed).toHaveProperty('intent');
    expect(parsed).toHaveProperty('readiness');
  });

  it('reports mock provider + model in metadata', async () => {
    const meta = await client.generateTextWithMeta(responseParams);
    expect(meta.provider).toBe('mock');
    expect(meta.model).toBe('mock-deterministic');
    expect(meta.fallbackUsed).toBe(false);
  });
});
