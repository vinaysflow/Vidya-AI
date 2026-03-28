import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock providers before importing orchestrator
vi.mock('../providers/elevenlabs', () => ({
  synthesizeElevenLabs: vi.fn(),
}));
vi.mock('../providers/openai', () => ({
  synthesizeOpenAI: vi.fn(),
}));

import { synthesizeSpeech } from '../tts';
import { synthesizeElevenLabs } from '../providers/elevenlabs';
import { synthesizeOpenAI } from '../providers/openai';

const mockEL = synthesizeElevenLabs as ReturnType<typeof vi.fn>;
const mockOAI = synthesizeOpenAI as ReturnType<typeof vi.fn>;

const fakeBuf = Buffer.from([0xff, 0xfb]);

describe('synthesizeSpeech orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure clean environment for each test
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('throws when no provider is configured', async () => {
    await expect(
      synthesizeSpeech('Hello', 'EN', 'MATHEMATICS'),
    ).rejects.toThrow('No TTS provider configured');
  });

  it('calls ElevenLabs when ELEVENLABS_API_KEY is set', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    mockEL.mockResolvedValue(fakeBuf);

    const result = await synthesizeSpeech('Hello', 'EN', 'MATHEMATICS');

    expect(mockEL).toHaveBeenCalledOnce();
    expect(mockOAI).not.toHaveBeenCalled();
    expect(result).toBe(fakeBuf);
  });

  it('calls OpenAI directly when only OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'oai-key';
    mockOAI.mockResolvedValue(fakeBuf);

    const result = await synthesizeSpeech('Hello', 'EN', 'MATHEMATICS');

    expect(mockEL).not.toHaveBeenCalled();
    expect(mockOAI).toHaveBeenCalledOnce();
    expect(result).toBe(fakeBuf);
  });

  it('falls through to OpenAI when ElevenLabs fails and OPENAI_API_KEY is set', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    process.env.OPENAI_API_KEY = 'oai-key';
    mockEL.mockRejectedValue(new Error('ElevenLabs 500'));
    mockOAI.mockResolvedValue(fakeBuf);

    const result = await synthesizeSpeech('Hello', 'EN', 'MATHEMATICS');

    expect(mockEL).toHaveBeenCalledOnce();
    expect(mockOAI).toHaveBeenCalledOnce();
    expect(result).toBe(fakeBuf);
  });

  it('throws when ElevenLabs fails and no OPENAI_API_KEY', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    mockEL.mockRejectedValue(new Error('ElevenLabs 500'));

    await expect(
      synthesizeSpeech('Hello', 'EN', 'MATHEMATICS'),
    ).rejects.toThrow('ElevenLabs 500');
    expect(mockOAI).not.toHaveBeenCalled();
  });

  it('passes options through to the selected provider', async () => {
    process.env.ELEVENLABS_API_KEY = 'el-key';
    mockEL.mockResolvedValue(fakeBuf);

    const opts = { tone: 'celebratory' as const, speed: 0.85 };
    await synthesizeSpeech('Hello', 'EN', 'MATHEMATICS', opts);

    expect(mockEL).toHaveBeenCalledWith('Hello', opts);
  });

  it('returns Buffer regardless of which provider is used', async () => {
    process.env.OPENAI_API_KEY = 'oai-key';
    mockOAI.mockResolvedValue(fakeBuf);

    const result = await synthesizeSpeech('Hello', 'EN', 'MATHEMATICS');
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
