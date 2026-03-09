# Static scene backgrounds

Add webp or png images here for instant-loading quest scenes. When present, they show immediately.
When absent, the StarScene fallback (star progress indicator) is used.

## Format
File format: PNG or WebP, ~1024x1024 or 16:9 aspect ratio.
Style: kid-friendly flat vector illustration, no text, bright colors.

## Generate with:
```
cd vidya/apps/api && npx tsx scripts/generate-scenes.ts
```

## All expected chapter backgrounds

### Original chapters (SVG scenes implemented in SceneCanvas.tsx):
- minecraft-builder.png
- kitchen-scientist.png
- playground-lab.png
- pattern-detective.png
- nature-explorer.png
- logic-detective.png
- adventures.png  (fallback)

### Previously unmapped (now mapped, need PNG):
- space-explorer.png
- dragon-academy.png
- ocean-discovery.png
- enchanted-forest.png

### New Biology chapters:
- body-detective.png
- ecosystem-explorer.png
- genetics-lab.png

### New Coding chapters:
- bug-hunter.png
- algorithm-arena.png
- code-architect.png

### New English Literature chapters:
- story-detective.png
- poetry-explorer.png
- argument-builder.png

### New Economics chapters:
- market-maker.png
- money-master.png

### New AI/ML chapters:
- robot-trainer.png
- bias-detective.png

### New Earth/Space Science chapters:
- planet-patrol.png
- weather-watcher.png

### New Logic/Essay chapters:
- puzzle-palace.png
- story-crafter.png
- persuasion-pro.png
