import OpenAI from 'openai';
import type { Subject, Language } from '@prisma/client';

const SUBJECT_PROMPTS: Partial<Record<Subject, string>> = {
  PHYSICS: 'Extract the physics problem. Represent equations in LaTeX. Describe any diagrams (force arrows, circuits, etc.).',
  MATHEMATICS: 'Extract the math problem. Represent all expressions in LaTeX notation.',
  CHEMISTRY: 'Extract the chemistry problem. Use proper chemical notation (subscripts, arrows for reactions).',
  CODING: 'Extract the code and any error messages verbatim. Preserve indentation and syntax.',
  AI_LEARNING: 'Extract the AI/ML problem. Describe any plots or data tables.',
};

interface OCRResult {
  extractedText: string;
  confidence: number;
  detectedSubject?: string;
}

export type OCRMode = 'extract' | 'describe';

export async function extractProblemFromImage(
  base64Image: string,
  subject?: Subject,
  language?: Language,
  mode: OCRMode = 'extract',
): Promise<OCRResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set — OCR unavailable');
    return { extractedText: '', confidence: 0 };
  }

  const openai = new OpenAI({ apiKey });

  const subjectHint = subject ? SUBJECT_PROMPTS[subject] || '' : '';
  const langHint = language && language !== 'EN' ? `The content may be in ${language}. ` : '';

  const systemPrompt =
    mode === 'describe'
      ? `You are looking at a drawing made by a grade 3 student (age 8) to explain their mathematical or scientific thinking. Describe what the child drew: shapes, groups, arrows, numbers, patterns. Then interpret what mathematical or scientific reasoning they are showing. Return JSON: { "extractedText": "<description of drawing and its meaning>", "confidence": 0.0-1.0 }`
      : `You are an OCR assistant for an educational tutoring platform. Extract the problem or question from the image. ${subjectHint} ${langHint}Return JSON: { "extractedText": "...", "confidence": 0.0-1.0, "detectedSubject": "PHYSICS|CHEMISTRY|..." }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the problem from this image.' },
            {
              type: 'image_url',
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          extractedText: parsed.extractedText || text,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          detectedSubject: parsed.detectedSubject,
        };
      }
    } catch (_) {}

    return { extractedText: text, confidence: 0.7 };
  } catch (err) {
    console.error('OCR extraction failed:', err);
    return { extractedText: '', confidence: 0 };
  }
}
