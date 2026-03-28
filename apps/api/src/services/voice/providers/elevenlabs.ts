import { getElevenLabsSettings } from '../toneMap';
import type { VoiceOptions } from '../toneMap';

export async function synthesizeElevenLabs(
  text: string,
  options: VoiceOptions = {},
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID not set');

  const voiceSettings = getElevenLabsSettings(options);

  // output_format is a QUERY PARAMETER, not a body field
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  console.log('[TTS:ElevenLabs] synthesizing', { chars: text.length, tone: options.tone });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: voiceSettings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
