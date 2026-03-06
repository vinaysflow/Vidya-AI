/**
 * Game API Routes
 * Kid-mode specific endpoints for scene images, etc.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateSceneImage } from '../services/game/sceneImageGenerator';

const router = Router();

const SceneImageSchema = z.object({
  questTitle: z.string().min(1).max(200),
  chapter: z.string().max(100).default('Adventures'),
  tags: z.array(z.string()).default([]),
  phase: z.enum(['loading', 'playing', 'celebration', 'explain-back', 'complete']).optional(),
});

/**
 * POST /api/game/scene-image
 * Generate a kid-friendly scene illustration for a quest
 */
router.post('/scene-image', async (req: Request, res: Response) => {
  try {
    const data = SceneImageSchema.parse(req.body);
    const imageUrl = await generateSceneImage({
      questTitle: data.questTitle,
      chapter: data.chapter,
      tags: data.tags,
      phase: data.phase,
    });

    if (!imageUrl) {
      return res.json({ success: false, imageUrl: null });
    }

    return res.json({ success: true, imageUrl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors });
    }
    console.error('[Game] scene-image error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate scene image' });
  }
});

export const gameRouter = router;
