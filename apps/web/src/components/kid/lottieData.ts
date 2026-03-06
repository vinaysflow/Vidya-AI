/**
 * Inline Lottie animation data for kid-mode feedback.
 * Keeping data inline avoids extra HTTP requests and works offline (PWA).
 *
 * confettiData  — bursting confetti, plays once on quest complete (~3 KB)
 * sparkleData   — small star sparkle, plays once on correct answer (~2 KB)
 */

// Confetti burst: 60-frame animation, 30fps, multi-coloured particles
export const confettiData = {
  v: '5.9.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Confetti',
  ddd: 0,
  assets: [],
  layers: [
    ...[
      { color: [1, 0.2, 0.2], startX: 150, startY: 150, endX: 60,  endY: 40,  rot: 360, size: 14 },
      { color: [1, 0.8, 0],   startX: 150, startY: 150, endX: 240, endY: 30,  rot: -270, size: 12 },
      { color: [0.2, 0.8, 0.2], startX: 150, startY: 150, endX: 30,  endY: 100, rot: 300, size: 10 },
      { color: [0.3, 0.5, 1],  startX: 150, startY: 150, endX: 270, endY: 80,  rot: -320, size: 13 },
      { color: [1, 0.4, 0.8],  startX: 150, startY: 150, endX: 100, endY: 20,  rot: 420, size: 11 },
      { color: [0.6, 0.2, 1],  startX: 150, startY: 150, endX: 200, endY: 60,  rot: -390, size: 10 },
      { color: [1, 0.6, 0.1],  startX: 150, startY: 150, endX: 50,  endY: 60,  rot: 280, size: 12 },
      { color: [0.1, 0.9, 0.8], startX: 150, startY: 150, endX: 250, endY: 120, rot: -300, size: 9 },
      { color: [1, 0.2, 0.5],  startX: 150, startY: 150, endX: 140, endY: 10,  rot: 350, size: 11 },
      { color: [0.4, 1, 0.4],  startX: 150, startY: 150, endX: 80,  endY: 180, rot: -260, size: 10 },
      { color: [1, 1, 0.2],    startX: 150, startY: 150, endX: 220, endY: 160, rot: 310, size: 13 },
      { color: [0.8, 0.2, 1],  startX: 150, startY: 150, endX: 170, endY: 200, rot: -340, size: 9 },
    ].map((p, idx) => ({
      ddd: 0,
      ind: idx + 1,
      ty: 4,
      nm: `piece-${idx}`,
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [100], e: [0] }, { t: 50, s: [100], e: [0] }, { t: 60, s: [0] }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [p.rot] }, { t: 60, s: [p.rot] }] },
        p: {
          a: 1,
          k: [
            { t: 0, s: [p.startX, p.startY, 0], e: [p.endX, p.endY + 80, 0] },
            { t: 60, s: [p.endX, p.endY + 80, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100, 100], e: [60, 60, 100] }, { t: 60, s: [60, 60, 100] }] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [p.size, p.size * 0.6] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 2 }, nm: 'rect', mn: 'ADBE Vector Shape - Rect' },
            { ty: 'fl', c: { a: 0, k: [...p.color, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'fill', mn: 'ADBE Vector Graphic - Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'g',
        },
      ],
      ip: 0,
      op: 60,
      st: idx * 2,
      bm: 0,
    })),
  ],
};

// Sparkle: 3 stars appear and fade in 24 frames
export const sparkleData = {
  v: '5.9.4',
  fr: 30,
  ip: 0,
  op: 24,
  w: 100,
  h: 100,
  nm: 'Sparkle',
  ddd: 0,
  assets: [],
  layers: [
    ...[
      { x: 50, y: 50, size: 18, delay: 0,  color: [1, 0.85, 0.1] },
      { x: 25, y: 30, size: 12, delay: 3,  color: [1, 0.6, 0.1] },
      { x: 75, y: 28, size: 10, delay: 5,  color: [1, 1, 0.3] },
      { x: 20, y: 65, size: 8,  delay: 7,  color: [0.3, 0.9, 1] },
      { x: 80, y: 70, size: 9,  delay: 2,  color: [0.9, 0.3, 1] },
    ].map((s, idx) => ({
      ddd: 0,
      ind: idx + 1,
      ty: 4,
      nm: `star-${idx}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: s.delay,      s: [0],   e: [100] },
            { t: s.delay + 8,  s: [100], e: [100] },
            { t: s.delay + 16, s: [100], e: [0] },
            { t: 24,           s: [0] },
          ],
        },
        r: { a: 1, k: [{ t: 0, s: [0], e: [180] }, { t: 24, s: [180] }] },
        p: { a: 0, k: [s.x, s.y, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: s.delay,     s: [0, 0, 100],         e: [100, 100, 100] },
            { t: s.delay + 8, s: [100, 100, 100],      e: [100, 100, 100] },
            { t: 24,          s: [40, 40, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sr',
              sy: 1,
              d: 1,
              pt: { a: 0, k: 4 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: s.size * 0.4 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: s.size },
              os: { a: 0, k: 0 },
              ix: 1,
              nm: 'star',
              mn: 'ADBE Vector Shape - Star',
            },
            { ty: 'fl', c: { a: 0, k: [...s.color, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'fill', mn: 'ADBE Vector Graphic - Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'g',
        },
      ],
      ip: 0,
      op: 24,
      st: 0,
      bm: 0,
    })),
  ],
};
