/**
 * Essay Prompt Knowledge Base Routes
 * 
 * Public endpoints for browsing and searching the essay prompt catalog.
 * All GET responses are cached via Redis (24h TTL) since prompts change once per year.
 * 
 * Admin endpoints for bulk import are protected by X-Admin-Secret.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, SchoolSelectivity, PromptCategory, PromptType } from '@prisma/client';
import { z } from 'zod';
import { cache, CACHE_TTL } from '../services/cache';

const router: express.Router = Router();
const prisma = new PrismaClient();

const DEFAULT_YEAR = '2025-2026';

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * GET /api/prompts/schools
 * List all schools, optionally filtered by search or selectivity.
 */
router.get('/schools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, selectivity, limit = '50', offset = '0' } = req.query;

    const cacheKey = `schools:list:${search || ''}:${selectivity || ''}:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const schools = await prisma.school.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { slug: { contains: search as string, mode: 'insensitive' } },
            { location: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
        ...(selectivity && { selectivity: selectivity as SchoolSelectivity }),
      },
      orderBy: [
        { acceptanceRate: 'asc' },
        { name: 'asc' },
      ],
      take: Math.min(parseInt(limit as string), 100),
      skip: parseInt(offset as string),
      include: {
        _count: { select: { prompts: true } },
      },
    });

    const result = {
      success: true,
      schools: schools.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        location: s.location,
        selectivity: s.selectivity,
        applicationPlatform: s.applicationPlatform,
        acceptanceRate: s.acceptanceRate,
        promptCount: s._count.prompts,
      })),
      total: schools.length,
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.SCHOOL_DATA);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/schools/:slug
 * Get a single school by slug, with prompt count.
 */
router.get('/schools/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const cacheKey = `school:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const school = await prisma.school.findUnique({
      where: { slug },
      include: {
        _count: { select: { prompts: true } },
      },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    const result = {
      success: true,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        location: school.location,
        selectivity: school.selectivity,
        applicationPlatform: school.applicationPlatform,
        acceptanceRate: school.acceptanceRate,
        websiteUrl: school.websiteUrl,
        essayPageUrl: school.essayPageUrl,
        promptCount: school._count.prompts,
      },
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.SCHOOL_DATA);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/schools/:slug/prompts
 * Get all essay prompts for a school, optionally filtered by year.
 */
router.get('/schools/:slug/prompts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const year = (req.query.year as string) || DEFAULT_YEAR;

    const cacheKey = `prompt:${slug}:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const school = await prisma.school.findUnique({
      where: { slug },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    const prompts = await prisma.essayPrompt.findMany({
      where: {
        schoolId: school.id,
        academicYear: year,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = {
      success: true,
      school: {
        name: school.name,
        slug: school.slug,
        applicationPlatform: school.applicationPlatform,
      },
      academicYear: year,
      prompts: prompts.map(p => ({
        id: p.id,
        promptText: p.promptText,
        wordLimit: p.wordLimit,
        charLimit: p.charLimit,
        required: p.required,
        promptType: p.promptType,
        promptCategory: p.promptCategory,
        sortOrder: p.sortOrder,
      })),
      total: prompts.length,
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.PROMPT_CATALOG);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/common-app
 * Shortcut: Get Common App personal statement prompts.
 */
router.get('/common-app', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = (req.query.year as string) || DEFAULT_YEAR;

    const cacheKey = `prompt:common-app:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const school = await prisma.school.findUnique({
      where: { slug: 'common-app' },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'Common App prompts not seeded yet' });
    }

    const prompts = await prisma.essayPrompt.findMany({
      where: {
        schoolId: school.id,
        academicYear: year,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = {
      success: true,
      name: 'Common Application Personal Statement',
      academicYear: year,
      instructions: 'Choose ONE of the following prompts. Word limit: 250-650 words.',
      prompts: prompts.map(p => ({
        id: p.id,
        number: p.sortOrder,
        promptText: p.promptText,
        wordLimit: p.wordLimit,
        required: p.required,
        promptCategory: p.promptCategory,
      })),
      total: prompts.length,
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.PROMPT_CATALOG);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/uc-piqs
 * Shortcut: Get UC Personal Insight Questions.
 */
router.get('/uc-piqs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = (req.query.year as string) || DEFAULT_YEAR;

    const cacheKey = `prompt:uc-piqs:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const school = await prisma.school.findUnique({
      where: { slug: 'uc-system' },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'UC PIQ prompts not seeded yet' });
    }

    const prompts = await prisma.essayPrompt.findMany({
      where: {
        schoolId: school.id,
        academicYear: year,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const result = {
      success: true,
      name: 'UC Personal Insight Questions',
      academicYear: year,
      instructions: 'Choose FOUR of the eight questions. Each response has a 350-word maximum.',
      prompts: prompts.map(p => ({
        id: p.id,
        number: p.sortOrder,
        promptText: p.promptText,
        wordLimit: p.wordLimit,
        required: p.required,
        promptCategory: p.promptCategory,
      })),
      total: prompts.length,
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.PROMPT_CATALOG);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/search
 * Full-text search across all prompts.
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category, type, year, limit = '20' } = req.query;

    if (!q && !category && !type) {
      return res.status(400).json({
        success: false,
        error: 'At least one of: q (keyword), category, or type is required',
      });
    }

    const prompts = await prisma.essayPrompt.findMany({
      where: {
        ...(q && {
          promptText: { contains: q as string, mode: 'insensitive' },
        }),
        ...(category && { promptCategory: category as PromptCategory }),
        ...(type && { promptType: type as PromptType }),
        ...(year ? { academicYear: year as string } : { academicYear: DEFAULT_YEAR }),
      },
      include: {
        school: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: Math.min(parseInt(limit as string), 50),
    });

    res.json({
      success: true,
      query: { q, category, type, year: year || DEFAULT_YEAR },
      prompts: prompts.map(p => ({
        id: p.id,
        schoolName: p.school?.name || 'Unknown',
        schoolSlug: p.school?.slug || 'unknown',
        promptText: p.promptText,
        wordLimit: p.wordLimit,
        required: p.required,
        promptType: p.promptType,
        promptCategory: p.promptCategory,
      })),
      total: prompts.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/categories
 * List all prompt categories with counts.
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = (req.query.year as string) || DEFAULT_YEAR;

    const cacheKey = `prompt:categories:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const categories = await prisma.essayPrompt.groupBy({
      by: ['promptCategory'],
      where: { academicYear: year },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const result = {
      success: true,
      academicYear: year,
      categories: categories.map(c => ({
        category: c.promptCategory,
        count: c._count.id,
      })),
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL.PROMPT_CATALOG);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// CROWDSOURCE ENDPOINT
// ============================================

const ContributePromptSchema = z.object({
  schoolName: z.string().min(2).max(200),
  academicYear: z.string().default('2025-2026'),
  promptText: z.string().min(10).max(5000),
  wordLimit: z.number().int().positive().optional(),
  charLimit: z.number().int().positive().optional(),
  required: z.boolean().default(true),
  promptType: z.enum(['PERSONAL_STATEMENT', 'SUPPLEMENTAL', 'SHORT_ANSWER', 'ACTIVITY_DESCRIPTION', 'WHY_SCHOOL']).default('SUPPLEMENTAL'),
  sourceUrl: z.string().url().optional(),
});

/**
 * POST /api/prompts/contribute
 * Submit a user-discovered essay prompt for review.
 * Protected by API key auth (Bearer token) -- any authenticated client.
 * The prompt is stored with sourceType=CROWDSOURCED and verifiedAt=null.
 */
router.post('/contribute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ContributePromptSchema.parse(req.body);

    // Auto-generate slug from school name
    const slug = data.schoolName
      .toLowerCase()
      .replace(/\buniversity\b/g, '')
      .replace(/\bcollege\b/g, '')
      .replace(/\binstitute\b/g, '')
      .replace(/\bof\b/g, '')
      .replace(/\bthe\b/g, '')
      .replace(/\bat\b/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    // Look up or create the school
    let school = await prisma.school.findUnique({ where: { slug } });
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: data.schoolName,
          slug,
          selectivity: 'SELECTIVE', // Default; admin can update later
        },
      });
    }

    // Check for duplicate: same school + very similar prompt text
    const existingPrompt = await prisma.essayPrompt.findFirst({
      where: {
        schoolId: school.id,
        academicYear: data.academicYear,
        promptText: { contains: data.promptText.slice(0, 80), mode: 'insensitive' },
      },
    });

    if (existingPrompt) {
      return res.status(409).json({
        success: false,
        error: 'A similar prompt already exists for this school and year',
        existingPromptId: existingPrompt.id,
      });
    }

    // Create the prompt (unverified)
    const prompt = await prisma.essayPrompt.create({
      data: {
        schoolId: school.id,
        academicYear: data.academicYear,
        promptText: data.promptText,
        wordLimit: data.wordLimit,
        charLimit: data.charLimit,
        required: data.required,
        promptType: data.promptType,
        promptCategory: 'OTHER', // Will be classified later
        sourceType: 'CROWDSOURCED',
        sourceUrl: data.sourceUrl,
        verifiedAt: null, // Pending review
      },
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your prompt submission has been received and is pending review.',
      prompt: {
        id: prompt.id,
        schoolName: school.name,
        schoolSlug: school.slug,
        status: 'pending_review',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Simple admin auth check (reuses X-Admin-Secret header).
 */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    res.status(500).json({ success: false, error: 'ADMIN_SECRET not configured' });
    return;
  }
  const providedSecret = req.headers['x-admin-secret'];
  if (providedSecret !== adminSecret) {
    res.status(401).json({ success: false, error: 'Invalid admin secret' });
    return;
  }
  next();
}

const ImportSchoolsSchema = z.array(z.object({
  name: z.string(),
  slug: z.string(),
  location: z.string().optional(),
  selectivity: z.enum(['MOST_SELECTIVE', 'HIGHLY_SELECTIVE', 'SELECTIVE', 'MODERATE']).default('SELECTIVE'),
  applicationPlatform: z.string().optional(),
  acceptanceRate: z.number().optional(),
  websiteUrl: z.string().optional(),
  essayPageUrl: z.string().optional(),
}));

const ImportPromptsSchema = z.array(z.object({
  schoolSlug: z.string(),
  academicYear: z.string().default('2025-2026'),
  promptText: z.string(),
  wordLimit: z.number().optional(),
  charLimit: z.number().optional(),
  required: z.boolean().default(true),
  promptType: z.enum(['PERSONAL_STATEMENT', 'SUPPLEMENTAL', 'SHORT_ANSWER', 'ACTIVITY_DESCRIPTION', 'WHY_SCHOOL']).default('SUPPLEMENTAL'),
  promptCategory: z.enum(['IDENTITY', 'CHALLENGE', 'INTELLECTUAL', 'COMMUNITY', 'GROWTH', 'WHY_US', 'CREATIVE', 'EXTRACURRICULAR', 'DIVERSITY', 'SHORT_ANSWER', 'OTHER']).default('OTHER'),
  sortOrder: z.number().default(0),
  sourceUrl: z.string().optional(),
}));

/**
 * POST /api/admin/prompts/schools
 * Bulk import schools.
 */
router.post('/admin/schools', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = ImportSchoolsSchema.parse(req.body);
    let created = 0;
    let updated = 0;

    for (const s of schools) {
      const result = await prisma.school.upsert({
        where: { slug: s.slug },
        update: { name: s.name, location: s.location, selectivity: s.selectivity, applicationPlatform: s.applicationPlatform, acceptanceRate: s.acceptanceRate, websiteUrl: s.websiteUrl, essayPageUrl: s.essayPageUrl },
        create: s,
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }

    res.json({ success: true, created, updated, total: schools.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/prompts/import
 * Bulk import prompts (requires school to already exist by slug).
 */
router.post('/admin/import', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prompts = ImportPromptsSchema.parse(req.body);
    let created = 0;
    let skipped = 0;

    for (const p of prompts) {
      const school = await prisma.school.findUnique({ where: { slug: p.schoolSlug } });
      if (!school) {
        skipped++;
        continue;
      }

      await prisma.essayPrompt.create({
        data: {
          schoolId: school.id,
          academicYear: p.academicYear,
          promptText: p.promptText,
          wordLimit: p.wordLimit,
          charLimit: p.charLimit,
          required: p.required,
          promptType: p.promptType,
          promptCategory: p.promptCategory,
          sortOrder: p.sortOrder,
          sourceType: 'MANUAL',
          sourceUrl: p.sourceUrl,
          verifiedAt: new Date(),
        },
      });
      created++;
    }

    res.json({ success: true, created, skipped, total: prompts.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/prompts/unverified
 * List all prompts pending review (verifiedAt IS NULL).
 */
router.get('/admin/unverified', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const prompts = await prisma.essayPrompt.findMany({
      where: { verifiedAt: null },
      include: {
        school: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 200),
      skip: parseInt(offset as string),
    });

    const total = await prisma.essayPrompt.count({ where: { verifiedAt: null } });

    res.json({
      success: true,
      prompts: prompts.map(p => ({
        id: p.id,
        schoolName: p.school?.name || 'Unknown',
        schoolSlug: p.school?.slug || 'unknown',
        academicYear: p.academicYear,
        promptText: p.promptText,
        wordLimit: p.wordLimit,
        required: p.required,
        promptType: p.promptType,
        promptCategory: p.promptCategory,
        sourceType: p.sourceType,
        sourceUrl: p.sourceUrl,
        createdAt: p.createdAt,
      })),
      total,
    });
  } catch (error) {
    next(error);
  }
});

const VerifyPromptSchema = z.object({
  promptCategory: z.enum(['IDENTITY', 'CHALLENGE', 'INTELLECTUAL', 'COMMUNITY', 'GROWTH', 'WHY_US', 'CREATIVE', 'EXTRACURRICULAR', 'DIVERSITY', 'SHORT_ANSWER', 'OTHER']).optional(),
  promptType: z.enum(['PERSONAL_STATEMENT', 'SUPPLEMENTAL', 'SHORT_ANSWER', 'ACTIVITY_DESCRIPTION', 'WHY_SCHOOL']).optional(),
  wordLimit: z.number().int().positive().optional(),
  required: z.boolean().optional(),
});

/**
 * PATCH /api/admin/prompts/:id/verify
 * Verify a crowdsourced/unverified prompt.
 * Sets verifiedAt and optionally updates category, type, wordLimit, required.
 */
router.patch('/admin/:id/verify', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = VerifyPromptSchema.parse(req.body);

    // Check prompt exists
    const existing = await prisma.essayPrompt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Prompt not found' });
    }

    const updated = await prisma.essayPrompt.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        ...(updates.promptCategory && { promptCategory: updates.promptCategory }),
        ...(updates.promptType && { promptType: updates.promptType }),
        ...(updates.wordLimit !== undefined && { wordLimit: updates.wordLimit }),
        ...(updates.required !== undefined && { required: updates.required }),
      },
      include: {
        school: { select: { name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      prompt: {
        id: updated.id,
        schoolName: updated.school?.name || 'Unknown',
        promptText: updated.promptText,
        promptCategory: updated.promptCategory,
        promptType: updated.promptType,
        verifiedAt: updated.verifiedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as promptsRouter };
