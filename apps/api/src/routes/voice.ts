import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { transcribeAudio } from '../services/voice/stt';
import { synthesizeSpeech } from '../services/voice/tts';
import type { Language, Subject } from '@prisma/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const language = (req.body.language || 'EN') as Language;
    const result = await transcribeAudio(req.file.buffer, language);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

const SynthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.enum(['EN', 'HI', 'KN', 'FR', 'DE', 'ES', 'ZH']).default('EN'),
  subject: z.enum([
    'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY',
    'ESSAY_WRITING', 'COUNSELING', 'CODING',
    'ENGLISH_LITERATURE', 'ECONOMICS', 'AI_LEARNING',
  ]).default('PHYSICS'),
});

router.post('/synthesize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, language, subject } = SynthesizeSchema.parse(req.body);
    const audioBuffer = await synthesizeSpeech(text, language as Language, subject as Subject);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length.toString() });
    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
});

export { router as voiceRouter };
