import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type LlmProvider = 'anthropic' | 'openai' | 'ollama' | 'vllm' | 'mock';
export type LlmModelType = 'analysis' | 'response';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateParams {
  modelType: LlmModelType;
  maxTokens: number;
  systemPrompt: string;
  messages: LlmMessage[];
  usePromptCache?: boolean;
  providerOverride?: string;
  modelOverride?: string;
}

export interface LlmGenerateResult {
  text: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
}

interface LlmClientOptions {
  anthropicApiKey?: string;
  openAIApiKey?: string;
  provider?: LlmProvider;
  fallbackProvider?: LlmProvider;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

const ANTHROPIC_MODELS: Record<LlmModelType, string> = {
  analysis: process.env.ANTHROPIC_ANALYSIS_MODEL || 'claude-3-haiku-20240307',
  response: process.env.ANTHROPIC_RESPONSE_MODEL || 'claude-3-haiku-20240307',
};

const OPENAI_MODELS: Record<LlmModelType, string> = {
  analysis: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4.1-nano',
  response: process.env.OPENAI_RESPONSE_MODEL || 'gpt-4.1-nano',
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const VLLM_BASE_URL = process.env.VLLM_BASE_URL || 'http://localhost:8000';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const VLLM_DEFAULT_MODEL = process.env.VLLM_MODEL || 'meta-llama/Llama-3.2-3B-Instruct';

const MAX_TOKENS_PER_MINUTE = Number.parseInt(process.env.LLM_MAX_TOKENS_PER_MINUTE || '', 10);
const MAX_TOKENS_PER_DAY = Number.parseInt(process.env.LLM_MAX_TOKENS_PER_DAY || '', 10);
const TOKEN_CHARS = Number.parseInt(process.env.LLM_TOKEN_CHARS || '', 10) || 4;
const HEALTH_TTL_MS = Number.parseInt(process.env.LLM_HEALTH_TTL_MS || '', 10) || 60_000;
const HEALTH_TIMEOUT_MS = Number.parseInt(process.env.LLM_HEALTH_TIMEOUT_MS || '', 10) || 2_000;

function normalizeProvider(value?: string): LlmProvider | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (
    normalized === 'anthropic' ||
    normalized === 'openai' ||
    normalized === 'ollama' ||
    normalized === 'vllm' ||
    normalized === 'mock'
  ) {
    return normalized as LlmProvider;
  }
  return undefined;
}

/**
 * Deterministic, offline mock provider so apps/api and CI can run a full turn
 * without any real provider key. Enabled with USE_MOCK_LLM=1 (or LLM_PROVIDER=mock).
 * It honors the Socratic contract: exactly one question per `response` turn and
 * no essay prose. `analysis` turns return a JSON superset that parses cleanly
 * for every module (essay / counselor / stem).
 */
export function isMockLlmEnabled(): boolean {
  const v = (process.env.USE_MOCK_LLM || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

const MOCK_QUESTIONS: readonly string[] = [
  "What's a moment from the last year that you keep coming back to?",
  'When you did that, what were you actually trying to change?',
  'Who noticed the difference you made, and what did they say?',
  'What did that experience teach you about yourself?',
  'If you stripped away what sounds impressive, what part still matters to you?',
  'What would you have done differently if no one was watching?',
  'Where did you feel most like yourself this year?',
  "What's the smallest detail from that story that you'd never forget?",
];

const MOCK_ANALYSIS = {
  // essay
  readiness: 50,
  strengths: [] as string[],
  gaps: [] as string[],
  suggestedFocus: 'understanding your story',
  hasDraft: false,
  // counselor
  intent: 'share',
  urgency: 'low',
  relevantContextAreas: [] as string[],
  sentimentTone: 'neutral',
  actionability: 50,
  // stem
  distanceFromSolution: 50,
  conceptsIdentified: [] as string[],
  conceptGaps: [] as string[],
  errorType: 'approach',
  errorDescription: null as string | null,
  studentStrengths: [] as string[],
  isAttemptShown: false,
};

function mockHashToInt(input: string): number {
  return createHash('sha256').update(input, 'utf8').digest().readUInt32BE(0);
}

export class LlmClient {
  private readonly anthropic?: Anthropic;
  private readonly openai?: OpenAI;
  private readonly provider: LlmProvider;
  private readonly fallbackProvider?: LlmProvider;
  private readonly providerHealth = new Map<LlmProvider, { ok: boolean; checkedAt: number; reason?: string }>();
  private minuteWindowStart = 0;
  private minuteTokens = 0;
  private dayDate = '';
  private dayTokens = 0;

  constructor(options: LlmClientOptions = {}) {
    const provider =
      options.provider ||
      (isMockLlmEnabled() ? 'mock' : undefined) ||
      normalizeProvider(process.env.LLM_PROVIDER) ||
      'ollama';
    const fallbackProvider = options.fallbackProvider || normalizeProvider(process.env.LLM_FALLBACK_PROVIDER);

    const anthropicApiKey = options.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    const openAIApiKey = options.openAIApiKey || process.env.OPENAI_API_KEY;

    if (anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    }
    if (openAIApiKey) {
      this.openai = new OpenAI({ apiKey: openAIApiKey });
    }

    this.provider = provider;
    this.fallbackProvider = fallbackProvider && fallbackProvider !== provider ? fallbackProvider : undefined;
  }

  /**
   * Generate text. Returns just the string (backward-compatible).
   */
  async generateText(params: LlmGenerateParams): Promise<string> {
    const result = await this.generateTextWithMeta(params);
    return result.text;
  }

  /**
   * Generate text with metadata about which provider/model was used.
   */
  async generateTextWithMeta(params: LlmGenerateParams): Promise<LlmGenerateResult> {
    const chosenProvider = (normalizeProvider(params.providerOverride) || this.provider) as LlmProvider;
    const chosenModel = params.modelOverride;

    try {
      await this.ensureProviderHealthy(chosenProvider);
      this.checkBudgets(this.estimateTokens(params));
      const text = await this.generateWithProvider(chosenProvider, params, chosenModel);
      return {
        text,
        provider: chosenProvider,
        model: chosenModel || this.resolveDefaultModel(chosenProvider, params.modelType),
        fallbackUsed: false,
      };
    } catch (error) {
      const fb = this.fallbackProvider;
      if (!fb) throw error;
      console.warn(`[LLM] Provider '${chosenProvider}' failed. Falling back to '${fb}'.`, error);
      await this.ensureProviderHealthy(fb);
      const text = await this.generateWithProvider(fb, params);
      return {
        text,
        provider: fb,
        model: this.resolveDefaultModel(fb, params.modelType),
        fallbackUsed: true,
      };
    }
  }

  private resolveDefaultModel(provider: LlmProvider, modelType: LlmModelType): string {
    switch (provider) {
      case 'anthropic': return ANTHROPIC_MODELS[modelType];
      case 'openai': return OPENAI_MODELS[modelType];
      case 'ollama': return OLLAMA_DEFAULT_MODEL;
      case 'vllm': return VLLM_DEFAULT_MODEL;
      case 'mock': return 'mock-deterministic';
    }
  }

  private async generateWithProvider(provider: LlmProvider, params: LlmGenerateParams, modelOverride?: string): Promise<string> {
    switch (provider) {
      case 'anthropic':
        if (!this.anthropic) throw new Error('Anthropic provider selected but ANTHROPIC_API_KEY is not configured');
        return this.callAnthropic(params, modelOverride);
      case 'openai':
        if (!this.openai) throw new Error('OpenAI provider selected but OPENAI_API_KEY is not configured');
        return this.callOpenAI(params, modelOverride);
      case 'ollama':
        return this.callOllama(params, modelOverride);
      case 'vllm':
        return this.callVllm(params, modelOverride);
      case 'mock':
        return this.callMock(params);
    }
  }

  /**
   * Deterministic offline generation. No network, no keys. Same inputs -> same
   * output, so it is safe for CI and golden-transcript evals.
   */
  private callMock(params: LlmGenerateParams): string {
    if (params.modelType === 'analysis') {
      return JSON.stringify(MOCK_ANALYSIS);
    }
    const lastUser = [...params.messages].reverse().find((m) => m.role === 'user');
    const seed = `${params.systemPrompt.slice(0, 64)}::${lastUser?.content ?? ''}`;
    const index = mockHashToInt(seed) % MOCK_QUESTIONS.length;
    return MOCK_QUESTIONS[index]!;
  }

  private async ensureProviderHealthy(provider: LlmProvider): Promise<void> {
    if (provider !== 'ollama' && provider !== 'vllm') return;

    const cached = this.providerHealth.get(provider);
    if (cached && Date.now() - cached.checkedAt < HEALTH_TTL_MS) {
      if (cached.ok) return;
      throw new Error(cached.reason || `${provider} is unavailable`);
    }

    try {
      await this.pingProvider(provider);
      this.providerHealth.set(provider, { ok: true, checkedAt: Date.now() });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.providerHealth.set(provider, { ok: false, checkedAt: Date.now(), reason });
      throw new Error(reason);
    }
  }

  private async pingProvider(provider: LlmProvider): Promise<void> {
    if (provider === 'ollama') {
      const response = await this.fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama health check failed (${response.status})`);
      }
      return;
    }

    if (provider === 'vllm') {
      const response = await this.fetchWithTimeout(`${VLLM_BASE_URL}/v1/models`);
      if (!response.ok) {
        throw new Error(`vLLM health check failed (${response.status})`);
      }
    }
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callAnthropic(params: LlmGenerateParams, modelOverride?: string): Promise<string> {
    const systemPayload = params.usePromptCache
      ? ([{ type: 'text', text: params.systemPrompt, cache_control: { type: 'ephemeral' } }] as any)
      : params.systemPrompt;

    const response = await this.anthropic!.messages.create({
      model: modelOverride || ANTHROPIC_MODELS[params.modelType],
      max_tokens: params.maxTokens,
      system: systemPayload,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const firstTextBlock = response.content.find((block) => block.type === 'text');
    if (!firstTextBlock || firstTextBlock.type !== 'text') {
      throw new Error('No text content returned from Anthropic');
    }
    return firstTextBlock.text;
  }

  private async callOpenAI(params: LlmGenerateParams, modelOverride?: string): Promise<string> {
    const response = await this.openai!.chat.completions.create({
      model: modelOverride || OPENAI_MODELS[params.modelType],
      max_tokens: params.maxTokens,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('No text content returned from OpenAI');
    return text;
  }

  /**
   * Ollama adapter: uses the /api/chat endpoint (local inference).
   */
  private async callOllama(params: LlmGenerateParams, modelOverride?: string): Promise<string> {
    const model = modelOverride || OLLAMA_DEFAULT_MODEL;
    const body = {
      model,
      stream: false,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      options: { num_predict: params.maxTokens },
    };

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ollama request failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    const text = data.message?.content;
    if (!text) throw new Error('No text content returned from Ollama');
    return text;
  }

  /**
   * vLLM adapter: uses the OpenAI-compatible /v1/chat/completions endpoint.
   */
  private async callVllm(params: LlmGenerateParams, modelOverride?: string): Promise<string> {
    const model = modelOverride || VLLM_DEFAULT_MODEL;
    const body = {
      model,
      max_tokens: params.maxTokens,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };

    const response = await fetch(`${VLLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`vLLM request failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No text content returned from vLLM');
    return text;
  }

  private estimateTokens(params: LlmGenerateParams): number {
    const messageChars = params.messages.reduce((sum, m) => sum + m.content.length, 0);
    const totalChars = params.systemPrompt.length + messageChars;
    const promptTokens = Math.ceil(totalChars / TOKEN_CHARS);
    return promptTokens + params.maxTokens;
  }

  private checkBudgets(tokensEstimate: number): void {
    const now = Date.now();
    if (Number.isFinite(MAX_TOKENS_PER_MINUTE) && MAX_TOKENS_PER_MINUTE > 0) {
      if (this.minuteWindowStart === 0 || now - this.minuteWindowStart >= 60_000) {
        this.minuteWindowStart = now;
        this.minuteTokens = 0;
      }
      if (this.minuteTokens + tokensEstimate > MAX_TOKENS_PER_MINUTE) {
        throw new BudgetExceededError(`LLM minute budget exceeded (${MAX_TOKENS_PER_MINUTE} tokens)`);
      }
      this.minuteTokens += tokensEstimate;
    }

    if (Number.isFinite(MAX_TOKENS_PER_DAY) && MAX_TOKENS_PER_DAY > 0) {
      const today = new Date().toISOString().slice(0, 10);
      if (!this.dayDate || this.dayDate !== today) {
        this.dayDate = today;
        this.dayTokens = 0;
      }
      if (this.dayTokens + tokensEstimate > MAX_TOKENS_PER_DAY) {
        throw new BudgetExceededError(`LLM daily budget exceeded (${MAX_TOKENS_PER_DAY} tokens)`);
      }
      this.dayTokens += tokensEstimate;
    }
  }
}
