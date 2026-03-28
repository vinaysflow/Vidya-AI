import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { voiceRouter } from '../../routes/voice';
import { makeRequest } from '../../test-utils';

vi.mock('../../services/voice/tts', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue(Buffer.from([0xff, 0xfb, 0x90, 0x00])),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/voice', voiceRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', issues: err.errors });
    }
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe('POST /api/voice/synthesize', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  const validOldPayload = {
    text: 'Hello Vidya',
    language: 'EN',
    subject: 'MATHEMATICS',
  };

  it('returns 200 with old payload (backward-compatible)', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', validOldPayload);
    expect(status).toBe(200);
  });

  it('returns 200 with new payload including tone and speed', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      tone: 'celebratory',
      speed: 0.85,
      calmMode: false,
    });
    expect(status).toBe(200);
  });

  it('returns 400 with invalid tone value', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      tone: 'angry',
    });
    expect(status).toBe(400);
  });

  it('returns 400 with speed below minimum', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      speed: 0.1,
    });
    expect(status).toBe(400);
  });

  it('returns 400 with speed above maximum', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      speed: 5.0,
    });
    expect(status).toBe(400);
  });

  it('returns 400 with empty text', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      text: '',
    });
    expect(status).toBe(400);
  });

  it('returns 400 with text over 5000 chars', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/voice/synthesize', {
      ...validOldPayload,
      text: 'a'.repeat(5001),
    });
    expect(status).toBe(400);
  });
});
