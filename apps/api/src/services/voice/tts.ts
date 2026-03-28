import type { Subject, Language } from '@prisma/client';
import type { VoiceOptions } from './toneMap';
import { synthesizeElevenLabs } from './providers/elevenlabs';
import { synthesizeOpenAI } from './providers/openai';
// TODO: Wire Azure as fallback 2 post-demo
// import { synthesizeAzure } from './providers/azure';

export type { VoiceOptions };

export async function synthesizeSpeech(
  text: string,
  _language: Language,
  _subject: Subject,
  options: VoiceOptions = {},
): Promise<Buffer> {
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasElevenLabs && !hasOpenAI) {
    throw new Error('No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.');
  }

  if (hasElevenLabs) {
    try {
      return await synthesizeElevenLabs(text, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[TTS] ElevenLabs failed, falling back to OpenAI', msg);
      if (!hasOpenAI) throw err;
    }
  }

  return synthesizeOpenAI(text, options);
}
