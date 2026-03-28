import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { synthesizeAzure, buildSSML } from '../azure';

describe('buildSSML', () => {
  it('builds SSML with mstts:express-as style tag', () => {
    const ssml = buildSSML('Hello', 'EN', { tone: 'celebratory' });
    expect(ssml).toContain('<mstts:express-as style="cheerful"');
  });

  it('maps EN language to en-US locale', () => {
    const ssml = buildSSML('Hello', 'EN', {});
    expect(ssml).toContain('en-US');
    expect(ssml).toContain('en-US-JennyNeural');
  });

  it('maps HI language to hi-IN locale', () => {
    const ssml = buildSSML('Namaste', 'HI', {});
    expect(ssml).toContain('hi-IN');
  });

  it('escapes XML special characters in text', () => {
    const ssml = buildSSML('5 < 10 & x > 0', 'EN', {});
    expect(ssml).toContain('&lt;');
    expect(ssml).toContain('&gt;');
    expect(ssml).toContain('&amp;');
  });
});

describe('synthesizeAzure', () => {
  const mockMp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00]);

  beforeEach(() => {
    process.env.AZURE_SPEECH_KEY = 'test-azure-key';
    process.env.AZURE_SPEECH_REGION = 'eastus';
  });

  afterEach(() => {
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
    vi.restoreAllMocks();
  });

  it('calls the correct Azure region URL', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeAzure('Hello', 'EN', {});

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('eastus.tts.speech.microsoft.com');
  });

  it('sets Ocp-Apim-Subscription-Key header', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeAzure('Hello', 'EN', {});

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'Ocp-Apim-Subscription-Key': 'test-azure-key',
    });
  });

  it('requests MP3 output format', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeAzure('Hello', 'EN', {});

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    });
  });

  it('returns a Buffer on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    const result = await synthesizeAzure('Hello', 'EN', {});
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('throws on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as unknown as Response);

    await expect(synthesizeAzure('Hello', 'EN', {})).rejects.toThrow('403');
  });

  it('throws when AZURE_SPEECH_KEY is missing', async () => {
    delete process.env.AZURE_SPEECH_KEY;
    await expect(synthesizeAzure('Hello', 'EN', {})).rejects.toThrow('AZURE_SPEECH_KEY not set');
  });

  it('throws when AZURE_SPEECH_REGION is missing', async () => {
    delete process.env.AZURE_SPEECH_REGION;
    await expect(synthesizeAzure('Hello', 'EN', {})).rejects.toThrow('AZURE_SPEECH_REGION not set');
  });
});
