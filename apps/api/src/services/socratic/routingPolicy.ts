import type { LlmProvider } from '../llm/client';

export interface ModelPolicyOverride {
  provider?: string;
  model?: string;
}

export function resolveModelPolicy(
  policy?: ModelPolicyOverride
): { provider?: LlmProvider; model?: string } {
  return {
    provider: normalizeProvider(policy?.provider),
    model: normalizeModel(policy?.model),
  };
}

function normalizeProvider(value?: string): LlmProvider | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'anthropic' || normalized === 'openai' || normalized === 'ollama' || normalized === 'vllm') {
    return normalized as LlmProvider;
  }
  return undefined;
}

function normalizeModel(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
