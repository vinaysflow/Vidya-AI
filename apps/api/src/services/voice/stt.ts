import OpenAI, { toFile } from 'openai';
import type { Language } from '@prisma/client';

const LANG_MAP: Partial<Record<Language, string>> = {
  EN: 'en', HI: 'hi', KN: 'kn', FR: 'fr', DE: 'de', ES: 'es', ZH: 'zh',
};

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: Language,
): Promise<{ text: string; confidence: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const openai = new OpenAI({ apiKey });
  const file = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: LANG_MAP[language] || 'en',
    response_format: 'json',
  });

  return {
    text: transcription.text,
    confidence: 0.9,
  };
}
