export type VoiceTone = 'supportive' | 'celebratory' | 'patient' | 'challenging';

export interface VoiceOptions {
  tone?: VoiceTone;
  speed?: number;
  calmMode?: boolean;
}

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
}

// ── ElevenLabs ────────────────────────────────────────────────────────────────

const ELEVENLABS_TONE_MAP: Record<VoiceTone, ElevenLabsVoiceSettings> = {
  supportive:   { stability: 0.40, similarity_boost: 0.70, style: 0.35 },
  celebratory:  { stability: 0.30, similarity_boost: 0.70, style: 0.50 },
  patient:      { stability: 0.55, similarity_boost: 0.70, style: 0.20 },
  challenging:  { stability: 0.35, similarity_boost: 0.70, style: 0.40 },
};

const ELEVENLABS_CALM_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.70,
  similarity_boost: 0.70,
  style: 0.10,
};

export function getElevenLabsSettings(opts: VoiceOptions = {}): ElevenLabsVoiceSettings {
  if (opts.calmMode) return ELEVENLABS_CALM_SETTINGS;
  return ELEVENLABS_TONE_MAP[opts.tone ?? 'supportive'];
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

const OPENAI_INSTRUCTIONS_MAP: Record<VoiceTone, string> = {
  supportive:
    'Speak warmly and gently, like a kind tutor encouraging a young student. ' +
    'Your tone is patient and reassuring. Speak at a moderate pace.',
  celebratory:
    'Sound genuinely happy and bright — like you are celebrating with a child. ' +
    'Upbeat and enthusiastic, but not loud or overwhelming. Keep it joyful.',
  patient:
    'Speak very calmly, very slowly, and very softly. ' +
    'You are helping a child who found something difficult. ' +
    'Be steady, warm, and unhurried. Every word lands gently.',
  challenging:
    'Sound confident and upbeat — like a coach giving a fun challenge. ' +
    'Encouraging but with some energy, as if you believe they can do it.',
};

const OPENAI_CALM_INSTRUCTIONS =
  'Minimal energy, very soft, with a completely steady rhythm. ' +
  'Speak slowly and clearly, like a gentle lullaby without singing. ' +
  'No peaks in emotion. Consistent warmth throughout.';

export function getOpenAIInstructions(opts: VoiceOptions = {}): string {
  if (opts.calmMode) return OPENAI_CALM_INSTRUCTIONS;
  return OPENAI_INSTRUCTIONS_MAP[opts.tone ?? 'supportive'];
}

// ── Azure ─────────────────────────────────────────────────────────────────────

const AZURE_STYLE_MAP: Record<VoiceTone, string> = {
  supportive:   'friendly',
  celebratory:  'cheerful',
  patient:      'calm',
  challenging:  'cheerful',
};

const AZURE_STYLE_DEGREE_MAP: Record<VoiceTone, number> = {
  supportive:   1.2,
  celebratory:  1.5,
  patient:      0.8,
  challenging:  1.3,
};

export interface AzureStyleSettings {
  style: string;
  styleDegree: number;
}

export function getAzureStyle(opts: VoiceOptions = {}): AzureStyleSettings {
  if (opts.calmMode) return { style: 'calm', styleDegree: 0.6 };
  const tone = opts.tone ?? 'supportive';
  return {
    style: AZURE_STYLE_MAP[tone],
    styleDegree: AZURE_STYLE_DEGREE_MAP[tone],
  };
}
