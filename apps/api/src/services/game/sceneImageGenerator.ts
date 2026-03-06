/**
 * Scene Image Generator for Kid Mode
 * Generates kid-friendly illustrations for quest scenes via DALL-E 3
 */

import OpenAI from 'openai';

const CHAPTER_PROMPT_HINTS: Record<string, string> = {
  'Minecraft Builder': 'blocky Minecraft-style world with blocks, lava, crafting table, pickaxe',
  'Kitchen Scientist': 'colorful kitchen with pots, ingredients, beakers, and science equipment',
  'Playground Lab': 'bright outdoor playground with swings, slides, ramps, and balls',
  'Pattern Detective': 'detective scene with magnifying glass, patterns, puzzle pieces, clues',
  'Nature Explorer': 'forest trail with plants, bugs, leaves, and natural elements',
  Adventures: 'friendly adventure scene suitable for children',
};

const sceneCache = new Map<string, string>();

export async function generateSceneImage(params: {
  questTitle: string;
  chapter: string;
  tags: string[];
  phase?: string;
}): Promise<string | null> {
  const { questTitle, chapter, tags, phase = 'playing' } = params;
  const cacheKey = `${questTitle}-${chapter}-${phase}`;
  const cached = sceneCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[SceneImage] OPENAI_API_KEY not set, skipping image generation');
    return null;
  }

  const hint = CHAPTER_PROMPT_HINTS[chapter] || CHAPTER_PROMPT_HINTS.Adventures;
  const tagDesc = tags.length > 0 ? tags.join(', ') : 'educational';
  const prompt = `A colorful, kid-friendly cartoon illustration for a children's educational game. Scene: ${questTitle}. Theme: ${hint}. Style: bright colors, simple shapes, Pixar-like, no text in image, safe for children aged 8-10. Include elements suggesting: ${tagDesc}.`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    });

    const b64 = response.data[0]?.b64_json;
    if (!b64) return null;

    const url = `data:image/png;base64,${b64}`;
    sceneCache.set(cacheKey, url);
    return url;
  } catch (err) {
    console.warn('[SceneImage] Generation failed:', err);
    return null;
  }
}
