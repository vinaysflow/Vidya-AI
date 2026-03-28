import { getAzureStyle } from '../toneMap';
import type { VoiceOptions } from '../toneMap';

// Language to Azure locale mapping
const LANGUAGE_LOCALE: Record<string, string> = {
  EN: 'en-US',
  HI: 'hi-IN',
  KN: 'kn-IN',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  ZH: 'zh-CN',
};

const AZURE_VOICE_NAME: Record<string, string> = {
  EN: 'en-US-JennyNeural',
  HI: 'hi-IN-SwaraNeural',
  KN: 'kn-IN-SapnaNeural',
  FR: 'fr-FR-DeniseNeural',
  DE: 'de-DE-KatjaNeural',
  ES: 'es-ES-ElviraNeural',
  ZH: 'zh-CN-XiaoxiaoNeural',
};

function buildSSML(text: string, language: string, options: VoiceOptions): string {
  const locale = LANGUAGE_LOCALE[language] ?? 'en-US';
  const voiceName = AZURE_VOICE_NAME[language] ?? 'en-US-JennyNeural';
  const { style, styleDegree } = getAzureStyle(options);

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${locale}">
  <voice name="${voiceName}">
    <mstts:express-as style="${style}" styledegree="${styleDegree}">
      ${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c))}
    </mstts:express-as>
  </voice>
</speak>`;
}

// NOTE: This provider is scaffolded but NOT wired into the tts.ts orchestrator for the demo.
// Wire in post-demo. See TODO in tts.ts.
export async function synthesizeAzure(
  text: string,
  language: string,
  options: VoiceOptions = {},
): Promise<Buffer> {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!apiKey) throw new Error('AZURE_SPEECH_KEY not set');
  if (!region) throw new Error('AZURE_SPEECH_REGION not set');

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = buildSSML(text, language, options);

  console.log('[TTS:Azure] synthesizing', { chars: text.length, tone: options.tone, language });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'vidya-tutor',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`Azure TTS API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { buildSSML };
