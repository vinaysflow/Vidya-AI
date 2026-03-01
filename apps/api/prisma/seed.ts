/**
 * Database Seed Script
 * 
 * Creates the initial API key for PathWiz integration.
 * Run with: pnpm db:seed
 * 
 * IMPORTANT: The generated API key is printed to console ONCE.
 * Save it immediately — it cannot be retrieved from the database later.
 */

import { PrismaClient } from '@prisma/client';
import { generateApiKey } from '../src/middleware/auth';
import { seedEssayPrompts } from './seeds/essayPrompts';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Vidya database...\n');

  // Check if PathWiz key already exists
  const existingKey = await prisma.apiKey.findFirst({
    where: { name: 'PathWiz Production' }
  });

  if (existingKey) {
    console.log('PathWiz API key already exists (prefix: %s)', existingKey.prefix);
    console.log('Skipping API key creation.\n');
  } else {

  // Generate PathWiz API key
  const { plainKey, hashedKey, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashedKey,
      prefix,
      name: 'PathWiz Production',
      ownerEmail: 'admin@mypathwiz.com',
      ownerName: 'MyPathWiz',
      tier: 'PREMIUM',
      rateLimit: 1000,
      allowedOrigins: [
        'https://mypathwiz.com',
        'https://www.mypathwiz.com',
        'http://localhost:5173',  // Local dev
        'http://localhost:3000'   // Local dev
      ]
    }
  });

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   PathWiz API Key Created Successfully                    ║');
  console.log('║                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log(`║   Key:    ${plainKey}`);
  console.log('║                                                           ║');
  console.log(`║   Prefix: ${prefix}`);
  console.log(`║   Tier:   ${apiKey.tier}`);
  console.log(`║   Limit:  ${apiKey.rateLimit} req/min`);
  console.log('║                                                           ║');
  console.log('║   ⚠  SAVE THIS KEY NOW — it cannot be retrieved later!   ║');
  console.log('║                                                           ║');
  console.log('║   Set in PathWiz .env:                                    ║');
  console.log('║   VITE_VIDYA_API_KEY=<the key above>                     ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  }

  // Seed essay prompts (Common App, UC PIQs, top 20 schools)
  await seedEssayPrompts(prisma);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
