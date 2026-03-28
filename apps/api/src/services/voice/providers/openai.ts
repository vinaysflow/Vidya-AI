import OpenAI from 'openai';
import { getOpenAIInstructions } from '../toneMap';
import type { VoiceOptions } from '../toneMap';

export function stripMath(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, (_, expr) => expr.replace(/[\\{}^_]/g, ' '))
    .replace(/\$([^$]+)\$/g, (_, expr) => expr.replace(/[\\{}^_]/g, ' '))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

export async function synthesizeOpenAI(
  text: string,
  options: VoiceOptions = {},
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const openai = new OpenAI({ apiKey });

  const cleanText = stripMath(text).slice(0, 4000);
  const instructions = getOpenAIInstructions(options);
  const speed = options.speed ?? 0.9;

  console.log('[TTS:OpenAI] synthesizing', { chars: cleanText.length, tone: options.tone });

  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'coral',
    input: cleanText,
    instructions,
    speed,
  } as Parameters<typeof openai.audio.speech.create>[0]);

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
