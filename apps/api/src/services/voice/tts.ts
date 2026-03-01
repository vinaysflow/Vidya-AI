import OpenAI from 'openai';
import type { Subject, Language } from '@prisma/client';

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

const SUBJECT_VOICE: Partial<Record<Subject, Voice>> = {
  PHYSICS: 'nova',
  MATHEMATICS: 'nova',
  CHEMISTRY: 'nova',
  BIOLOGY: 'nova',
  CODING: 'echo',
  AI_LEARNING: 'echo',
  ESSAY_WRITING: 'shimmer',
  ENGLISH_LITERATURE: 'shimmer',
  COUNSELING: 'alloy',
  ECONOMICS: 'fable',
};

function stripMath(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, (_, expr) => expr.replace(/[\\{}^_]/g, ' '))
    .replace(/\$([^$]+)\$/g, (_, expr) => expr.replace(/[\\{}^_]/g, ' '))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

export async function synthesizeSpeech(
  text: string,
  language: Language,
  subject: Subject,
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const openai = new OpenAI({ apiKey });
  const voice = SUBJECT_VOICE[subject] || 'nova';
  const cleanText = stripMath(text).slice(0, 4096);

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: cleanText,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
