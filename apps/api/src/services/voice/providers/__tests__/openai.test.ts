import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { synthesizeOpenAI, stripMath } from '../openai';

// Mock the openai module
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        speech: {
          create: mockCreate,
        },
      },
    })),
    __mockCreate: mockCreate,
  };
});

async function getMockCreate() {
  const mod = await import('openai');
  return (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
}

describe('stripMath', () => {
  it('removes LaTeX block math', () => {
    expect(stripMath('$$x^2 + y^2$$')).not.toContain('$$');
  });

  it('removes LaTeX inline math', () => {
    expect(stripMath('The value of $x$')).not.toContain('$x$');
  });

  it('removes markdown bold', () => {
    expect(stripMath('**bold**')).toBe('bold');
  });

  it('removes markdown italic', () => {
    expect(stripMath('*italic*')).toBe('italic');
  });
});

describe('synthesizeOpenAI', () => {
  const mockMp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00]);

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.clearAllMocks();
  });

  it('uses model gpt-4o-mini-tts', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      arrayBuffer: async () => mockMp3.buffer,
    });

    await synthesizeOpenAI('Hello', {});

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-tts' }),
    );
  });

  it('uses voice coral', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    await synthesizeOpenAI('Hello', {});

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ voice: 'coral' }),
    );
  });

  it('passes instructions for tone', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    await synthesizeOpenAI('Hello', { tone: 'supportive' });

    const call = mockCreate.mock.calls[0][0];
    expect(call.instructions).toBeTruthy();
    expect(call.instructions.toLowerCase()).toMatch(/warm|gentle/);
  });

  it('passes speed parameter', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    await synthesizeOpenAI('Hello', { speed: 0.75 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0.75 }),
    );
  });

  it('strips math from input', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    await synthesizeOpenAI('Solve $x^2$', {});

    const call = mockCreate.mock.calls[0][0];
    expect(call.input).not.toContain('$');
  });

  it('truncates input to 4000 chars', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    const longText = 'a'.repeat(5000);
    await synthesizeOpenAI(longText, {});

    const call = mockCreate.mock.calls[0][0];
    expect(call.input.length).toBeLessThanOrEqual(4000);
  });

  it('returns a Buffer on success', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ arrayBuffer: async () => mockMp3.buffer });

    const result = await synthesizeOpenAI('Hello', {});
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(synthesizeOpenAI('Hello', {})).rejects.toThrow('OPENAI_API_KEY not set');
  });
});
