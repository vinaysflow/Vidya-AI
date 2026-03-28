import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { synthesizeElevenLabs } from '../elevenlabs';

describe('synthesizeElevenLabs', () => {
  const mockMp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // fake MP3 header

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
    process.env.ELEVENLABS_VOICE_ID = 'test-voice-id';
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    vi.restoreAllMocks();
  });

  it('calls the correct URL with output_format as query parameter', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeElevenLabs('Hello', { tone: 'supportive' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('test-voice-id');
    expect(url).toContain('?output_format=mp3_44100_128');
  });

  it('does NOT include output_format in the JSON body', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeElevenLabs('Hello', { tone: 'supportive' });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('output_format');
  });

  it('sets xi-api-key header from env', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeElevenLabs('Hello', {});

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ 'xi-api-key': 'test-api-key' });
  });

  it('uses model eleven_flash_v2_5 in body', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeElevenLabs('Hello', {});

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model_id).toBe('eleven_flash_v2_5');
  });

  it('maps tone options into voice_settings', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    await synthesizeElevenLabs('Hello', { tone: 'celebratory' });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.voice_settings.stability).toBe(0.30);
    expect(body.voice_settings.style).toBe(0.50);
  });

  it('returns a Buffer on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockMp3.buffer,
    } as unknown as Response);

    const result = await synthesizeElevenLabs('Hello', {});
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('throws with status code on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as unknown as Response);

    await expect(synthesizeElevenLabs('Hello', {})).rejects.toThrow('401');
  });

  it('throws when ELEVENLABS_API_KEY is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    await expect(synthesizeElevenLabs('Hello', {})).rejects.toThrow('ELEVENLABS_API_KEY not set');
  });

  it('throws when ELEVENLABS_VOICE_ID is missing', async () => {
    delete process.env.ELEVENLABS_VOICE_ID;
    await expect(synthesizeElevenLabs('Hello', {})).rejects.toThrow('ELEVENLABS_VOICE_ID not set');
  });
});
