/**
 * SceneCanvas — animated CSS/SVG game scene that reacts to quest progress.
 * Pure CSS + inline SVG. No external images, no animation libraries.
 *
 * Props:
 *   chapter    — determines which scene template to render
 *   progress   — 0 to 1 (fraction of correct answers out of 5)
 *   lastResult — 'correct' | 'wrong' | null (triggers momentary animation)
 */

import { useEffect, useState } from 'react';

export interface SceneCanvasProps {
  chapter: string;
  progress: number;        // 0..1
  lastResult: 'correct' | 'wrong' | null;
}

const CHAPTER_BG_IMAGES: Record<string, string> = {
  // Original chapters
  'Minecraft Builder': '/scenes/minecraft-builder.png',
  'Kitchen Scientist': '/scenes/kitchen-scientist.png',
  'Playground Lab': '/scenes/playground-lab.png',
  'Pattern Detective': '/scenes/pattern-detective.png',
  'Nature Explorer': '/scenes/nature-explorer.png',
  'Logic Detective': '/scenes/logic-detective.png',
  'Space Explorer': '/scenes/space-explorer.png',
  'Dragon Academy': '/scenes/dragon-academy.png',
  'Ocean Discovery': '/scenes/ocean-discovery.png',
  'Enchanted Forest': '/scenes/enchanted-forest.png',
  // Biology chapters
  'Body Detective': '/scenes/body-detective.png',
  'Ecosystem Explorer': '/scenes/ecosystem-explorer.png',
  'Genetics Lab': '/scenes/genetics-lab.png',
  // Coding chapters
  'Bug Hunter': '/scenes/bug-hunter.png',
  'Algorithm Arena': '/scenes/algorithm-arena.png',
  'Code Architect': '/scenes/code-architect.png',
  // English Lit chapters
  'Story Detective': '/scenes/story-detective.png',
  'Poetry Explorer': '/scenes/poetry-explorer.png',
  'Argument Builder': '/scenes/argument-builder.png',
  // Economics chapters
  'Market Maker': '/scenes/market-maker.png',
  'Money Master': '/scenes/money-master.png',
  // AI/ML chapters
  'Robot Trainer': '/scenes/robot-trainer.png',
  'Bias Detective': '/scenes/bias-detective.png',
  // Earth/Space Science chapters
  'Planet Patrol': '/scenes/planet-patrol.png',
  'Weather Watcher': '/scenes/weather-watcher.png',
  // Logic/Essay chapters
  'Puzzle Palace': '/scenes/puzzle-palace.png',
  'Story Crafter': '/scenes/story-crafter.png',
  'Persuasion Pro': '/scenes/persuasion-pro.png',
  // Fallback
  'Adventures': '/scenes/adventures.png',
};

export function SceneCanvas({ chapter, progress, lastResult }: SceneCanvasProps) {
  const bgImage = CHAPTER_BG_IMAGES[chapter] ?? CHAPTER_BG_IMAGES['Adventures'];
  if (chapter === 'Minecraft Builder') {
    return <MinecraftScene progress={progress} lastResult={lastResult} bgImage={bgImage} />;
  }
  if (chapter === 'Kitchen Scientist') {
    return <KitchenScene progress={progress} lastResult={lastResult} bgImage={bgImage} />;
  }
  if (chapter === 'Playground Lab') {
    return <PlaygroundScene progress={progress} lastResult={lastResult} bgImage={bgImage} />;
  }
  if (chapter === 'Pattern Detective') {
    return <PatternDetectiveScene progress={progress} lastResult={lastResult} bgImage={bgImage} />;
  }
  if (chapter === 'Nature Explorer') {
    return <NatureExplorerScene progress={progress} lastResult={lastResult} bgImage={bgImage} />;
  }
  return <StarScene progress={progress} lastResult={lastResult} chapter={chapter} bgImage={bgImage} />;
}

// ─── Minecraft Builder ────────────────────────────────────────────────────────

function MinecraftScene({ progress, lastResult, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; bgImage: string }) {
  // How many bridge blocks to show (0-6)
  const blockCount = Math.round(progress * 6);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (lastResult) setAnimKey((k) => k + 1);
  }, [lastResult]);

  const sceneAnim = lastResult === 'correct'
    ? 'animate-[scenePulse_0.4s_ease-in-out]'
    : '';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl ${sceneAnim}`}
      style={{
        height: '28vh', minHeight: 120, maxHeight: 240,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <svg
        viewBox="0 0 400 220"
        className="h-full w-full"
        role="img"
        aria-label="Minecraft bridge scene"
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#1a3a2a" />
          </linearGradient>
          <linearGradient id="lavaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6600" />
            <stop offset="50%" stopColor="#ff3300" />
            <stop offset="100%" stopColor="#cc2200" />
          </linearGradient>
        </defs>

        {/* Background — semi-transparent when AI image is present */}
        <rect x="0" y="0" width="400" height="220" fill="url(#skyGrad)" opacity="0.4" />

        {/* Stars */}
        {[[30,20],[80,15],[150,25],[220,12],[300,18],[360,22],[50,45],[180,40],[340,35]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={1.5} fill="white" opacity={0.6 + (i%3)*0.15} />
        ))}

        {/* Moon */}
        <circle cx="350" cy="30" r="18" fill="#fffde7" opacity={0.9} />
        <circle cx="358" cy="25" r="14" fill="#1a3a2a" />

        {/* Left cliff */}
        <rect x="0" y="140" width="80" height="80" fill="#2d5a27" />
        <rect x="0" y="120" width="80" height="25" fill="#3d7a37" />
        {/* Grass tufts */}
        {[10,25,40,55,68].map((x,i) => (
          <rect key={i} x={x} y="115" width="4" height="8" fill="#4caf50" />
        ))}

        {/* Right cliff */}
        <rect x="320" y="140" width="80" height="80" fill="#2d5a27" />
        <rect x="320" y="120" width="80" height="25" fill="#3d7a37" />
        {[328,342,356,370,384].map((x,i) => (
          <rect key={i} x={x} y="115" width="4" height="8" fill="#4caf50" />
        ))}

        {/* Lava pit */}
        <rect x="80" y="150" width="240" height="70" fill="url(#lavaGrad)" className="animate-[lavaGlow_1.5s_ease-in-out_infinite]" />
        {/* Lava bubbles */}
        {[[110,165],[160,172],[200,160],[250,168],[290,163]].map(([cx,cy],i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={8} ry={4} fill="#ff8800" opacity={0.6} />
        ))}

        {/* Bridge blocks - 6 slots from x=80 to x=320, each 40px wide */}
        {Array.from({ length: 6 }).map((_, i) => {
          const x = 80 + i * 40;
          const placed = i < blockCount;
          const isNewest = placed && i === blockCount - 1;
          const wobble = lastResult === 'wrong' && isNewest;
          const slam = lastResult === 'correct' && isNewest;

          if (!placed) {
            // Ghost / placeholder slot
            return (
              <rect
                key={i}
                x={x + 1} y={118} width={38} height={22}
                fill="none"
                stroke="#ffffff22"
                strokeWidth={1}
                strokeDasharray="4 4"
                rx={2}
              />
            );
          }

          return (
            <g key={`${i}-${animKey}`}>
              {/* Block shadow */}
              <rect x={x + 3} y={142} width={38} height={4} fill="#00000033" rx={1} />
              {/* Main block */}
              <rect
                x={x + 1} y={118} width={38} height={24}
                fill="#5d8a3c"
                rx={2}
                style={
                  slam ? { animation: 'blockSlam 0.4s ease-out' } :
                  wobble ? { animation: 'blockWobble 0.5s ease-in-out' } :
                  undefined
                }
              />
              {/* Block top highlight */}
              <rect x={x + 3} y={119} width={34} height={5} fill="#6ea34a" rx={1} opacity={0.7} />
              {/* Block grid lines */}
              <rect x={x + 13} y={118} width={1} height={24} fill="#3d6a2c" opacity={0.5} />
              <rect x={x + 26} y={118} width={1} height={24} fill="#3d6a2c" opacity={0.5} />
            </g>
          );
        })}

        {/* Player character on left cliff */}
        <g transform="translate(55, 95)">
          <rect x="0" y="8" width="12" height="14" fill="#2196f3" rx={1} />
          <rect x="1" y="0" width="10" height="10" fill="#ffcc80" rx={1} />
          <rect x="3" y="3" width="2" height="2" fill="#333" />
          <rect x="7" y="3" width="2" height="2" fill="#333" />
          <rect x="1" y="22" width="4" height="6" fill="#1565c0" rx={1} />
          <rect x="7" y="22" width="4" height="6" fill="#1565c0" rx={1} />
        </g>

        {/* Creeper on right cliff — reacts to correct/wrong */}
        <g
          transform={`translate(340, 88)`}
          style={lastResult === 'correct'
            ? { animation: 'vidya-jump 0.5s ease-out' }
            : lastResult === 'wrong'
            ? { animation: 'vidya-tilt 0.4s ease-in-out' }
            : undefined}
        >
          {/* Creeper head */}
          <rect x="0" y="0" width="20" height="20" fill="#4caf50" rx={2} />
          {/* Creeper face */}
          <rect x="3" y="5" width="5" height="5" fill="#1b5e20" />
          <rect x="12" y="5" width="5" height="5" fill="#1b5e20" />
          <rect x="6" y="12" width="3" height="4" fill="#1b5e20" />
          <rect x="11" y="12" width="3" height="4" fill="#1b5e20" />
          <rect x="6" y="16" width="8" height="2" fill="#1b5e20" />
          {/* Creeper body */}
          <rect x="3" y="20" width="14" height="16" fill="#388e3c" rx={1} />
          {/* Creeper legs */}
          <rect x="3" y="36" width="5" height="8" fill="#2e7d32" rx={1} />
          <rect x="12" y="36" width="5" height="8" fill="#2e7d32" rx={1} />
          {/* Happy glow when correct */}
          {lastResult === 'correct' && (
            <circle cx="10" cy="10" r="14" fill="#a5d6a7" opacity={0.3} />
          )}
        </g>

        {/* Progress label */}
        <text x="200" y="210" textAnchor="middle" fill="#ffffff88" fontSize="11" fontFamily="monospace">
          {blockCount}/6 blocks placed
        </text>
      </svg>

      {/* Correct/Wrong overlay flash */}
      {lastResult === 'correct' && (
        <div
          key={`flash-${animKey}`}
          className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]"
        />
      )}
      {lastResult === 'wrong' && (
        <div
          key={`shake-${animKey}`}
          className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]"
        />
      )}
    </div>
  );
}

// ─── Kitchen Scientist ────────────────────────────────────────────────────────

function KitchenScene({ progress, lastResult, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; bgImage: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (lastResult) setAnimKey((k) => k + 1); }, [lastResult]);

  // Volcano fill level based on progress
  const fillHeight = Math.round(progress * 60);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '28vh', minHeight: 120, maxHeight: 240, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Kitchen science scene">
        <defs>
          <linearGradient id="counterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff8e1" />
            <stop offset="100%" stopColor="#ffe082" />
          </linearGradient>
        </defs>

        {/* Background — semi-transparent overlay */}
        <rect width="400" height="220" fill="#fff8e1" opacity="0.3" />
        {/* Counter */}
        <rect x="0" y="160" width="400" height="60" fill="url(#counterGrad)" />
        <rect x="0" y="158" width="400" height="4" fill="#ffca28" />

        {/* Volcano mountain */}
        <polygon points="160,160 200,70 240,160" fill="#795548" />
        <polygon points="165,160 200,75 235,160" fill="#8d6e63" />
        {/* Crater opening */}
        <ellipse cx="200" cy="72" rx="18" ry="8" fill="#4e342e" />
        {/* Lava fill inside crater - grows with progress */}
        {fillHeight > 0 && (
          <ellipse
            cx="200"
            cy="72"
            rx={Math.min(16, 8 + fillHeight * 0.13)}
            ry={Math.min(6, 3 + fillHeight * 0.05)}
            fill="#ff6f00"
            style={lastResult === 'correct' ? { animation: 'scenePulse 0.4s ease-out' } : undefined}
          />
        )}
        {/* Overflow foam when progress > 0.5 */}
        {progress > 0.5 && (
          <>
            <ellipse cx="195" cy="76" rx="12" ry="5" fill="#ff8f00" opacity={0.8} />
            <path d="M188,76 Q195,90 185,100" stroke="#ff6f00" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M212,76 Q205,88 215,98" stroke="#ff6f00" strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Baking soda box */}
        <rect x="80" y="140" width="40" height="22" fill="#ffffff" stroke="#bbdefb" strokeWidth={1} rx={2} />
        <text x="100" y="155" textAnchor="middle" fill="#1565c0" fontSize="8" fontWeight="bold">BAKING{'\n'}SODA</text>

        {/* Vinegar bottle */}
        <rect x="270" y="130" width="22" height="32" fill="#e8f5e9" stroke="#a5d6a7" strokeWidth={1} rx={3} />
        <rect x="275" y="126" width="12" height="6" fill="#c8e6c9" rx={2} />
        <text x="281" y="148" textAnchor="middle" fill="#2e7d32" fontSize="7">VINEGAR</text>

        {/* Bubbles when progress > 0.3 */}
        {progress > 0.3 && ['190,60','200,52','207,62','196,48'].map((pos,i) => (
          <circle key={i} cx={pos.split(',')[0]} cy={pos.split(',')[1]} r={3 + i} fill="white" opacity={0.7}
            style={{ animation: `vidya-bounce ${0.8+i*0.2}s ease-in-out infinite`, animationDelay: `${i*0.15}s` }}
          />
        ))}

        {/* Kid scientist — reacts to feedback */}
        <g
          transform="translate(310, 108)"
          style={lastResult === 'correct'
            ? { animation: 'vidya-jump 0.5s ease-out' }
            : lastResult === 'wrong'
            ? { animation: 'vidya-tilt 0.4s ease-in-out' }
            : undefined}
        >
          {/* Lab coat body */}
          <rect x="0" y="18" width="24" height="22" fill="white" rx={3} stroke="#e0e0e0" strokeWidth={1} />
          {/* Head */}
          <circle cx="12" cy="12" r="11" fill="#ffcc80" />
          {/* Hair */}
          <ellipse cx="12" cy="4" rx="9" ry="5" fill="#5d4037" />
          {/* Eyes */}
          <circle cx="8" cy="12" r="2" fill="#333" />
          <circle cx="16" cy="12" r="2" fill="#333" />
          {/* Smile / surprised based on result */}
          {lastResult === 'correct'
            ? <path d="M7,17 Q12,22 17,17" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            : <circle cx="12" cy="18" r="2" fill="#333" />
          }
          {/* Lab coat collar */}
          <path d="M6,18 L12,24 L18,18" stroke="#bdbdbd" strokeWidth={1} fill="none" />
          {/* Goggles when working */}
          <ellipse cx="8" cy="12" rx="3.5" ry="3" fill="none" stroke="#42a5f5" strokeWidth={1.5} />
          <ellipse cx="16" cy="12" rx="3.5" ry="3" fill="none" stroke="#42a5f5" strokeWidth={1.5} />
          <line x1="11.5" y1="12" x2="12.5" y2="12" stroke="#42a5f5" strokeWidth={1.5} />
          {/* Arms */}
          <line x1="0" y1="24" x2="-6" y2="32" stroke="white" strokeWidth={5} strokeLinecap="round" />
          <line x1="24" y1="24" x2="30" y2="32" stroke="white" strokeWidth={5} strokeLinecap="round" />
          {/* Beaker in hand */}
          <rect x="30" y="28" width="8" height="12" fill="#e3f2fd" stroke="#42a5f5" strokeWidth={1} rx={1} />
          <rect x="31" y="32" width="6" height="5" fill="#90caf9" opacity={0.7} />
        </g>

        <text x="200" y="212" textAnchor="middle" fill="#79554888" fontSize="11" fontFamily="monospace">
          {Math.round(progress * 100)}% complete
        </text>
      </svg>

      {lastResult === 'correct' && (
        <div key={`f-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]" />
      )}
      {lastResult === 'wrong' && (
        <div key={`s-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]" />
      )}
    </div>
  );
}

// ─── Playground Lab ───────────────────────────────────────────────────────────

function PlaygroundScene({ progress, lastResult, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; bgImage: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (lastResult) setAnimKey((k) => k + 1); }, [lastResult]);

  // Seesaw angle based on progress
  const seesawAngle = -20 + progress * 40;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '28vh', minHeight: 120, maxHeight: 240, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Playground scene">
        {/* Sky — semi-transparent overlay */}
        <rect width="400" height="220" fill="#e3f2fd" opacity="0.25" />
        {/* Clouds */}
        <ellipse cx="80" cy="35" rx="35" ry="18" fill="white" opacity={0.9} />
        <ellipse cx="110" cy="28" rx="28" ry="16" fill="white" opacity={0.9} />
        <ellipse cx="300" cy="40" rx="30" ry="14" fill="white" opacity={0.85} />

        {/* Ground */}
        <rect x="0" y="170" width="400" height="50" fill="#66bb6a" />
        <rect x="0" y="168" width="400" height="5" fill="#4caf50" />

        {/* Sun */}
        <circle cx="340" cy="40" r="25" fill="#ffd54f" />
        {[0,45,90,135,180,225,270,315].map((deg,i) => {
          const rad = (deg * Math.PI) / 180;
          return <line key={i} x1={340 + Math.cos(rad)*28} y1={40 + Math.sin(rad)*28}
            x2={340 + Math.cos(rad)*36} y2={40 + Math.sin(rad)*36}
            stroke="#ffd54f" strokeWidth={2} />;
        })}

        {/* Seesaw */}
        <g transform={`translate(200, 155) rotate(${seesawAngle})`}>
          {/* Plank */}
          <rect x="-80" y="-6" width="160" height="10" fill="#ff7043" rx={3} />
        </g>
        {/* Fulcrum */}
        <polygon points="190,168 200,148 210,168" fill="#f57c00" />

        {/* Kid on left of seesaw */}
        <g transform={`translate(${120 + Math.sin(seesawAngle * Math.PI/180) * 10}, ${130 - Math.cos(seesawAngle * Math.PI/180) * 10})`}>
          <circle cx="0" cy="-10" r="8" fill="#ffcc80" />
          <rect x="-6" y="-2" width="12" height="14" fill="#e91e63" rx={2} />
        </g>

        {/* Stars collected (progress indicator) */}
        {Array.from({ length: 5 }).map((_, i) => (
          <g key={i} transform={`translate(${60 + i * 65}, 25)`}>
            {i < Math.round(progress * 5) ? (
              <text fontSize="18" fill="#ffd54f" textAnchor="middle"
                style={i === Math.round(progress * 5) - 1 && lastResult === 'correct'
                  ? { animation: 'starAppear 0.5s ease-out' } : undefined}>
                ★
              </text>
            ) : (
              <text fontSize="18" fill="#cfd8dc" textAnchor="middle">☆</text>
            )}
          </g>
        ))}

        <text x="200" y="212" textAnchor="middle" fill="#1b5e2077" fontSize="11" fontFamily="monospace">
          {Math.round(progress * 5)}/5 stars
        </text>
      </svg>

      {lastResult === 'correct' && (
        <div key={`f-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]" />
      )}
      {lastResult === 'wrong' && (
        <div key={`s-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]" />
      )}
    </div>
  );
}

// ─── Pattern Detective ────────────────────────────────────────────────────────

function PatternDetectiveScene({ progress, lastResult, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; bgImage: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (lastResult) setAnimKey((k) => k + 1); }, [lastResult]);

  // How many pattern blocks are "revealed" — 0-8
  const revealed = Math.round(progress * 8);

  const PATTERN_COLORS = ['#e91e63', '#3f51b5', '#e91e63', '#3f51b5', '#e91e63', '#3f51b5', '#e91e63', '#3f51b5'];
  const PATTERN_SHAPES = ['circle', 'rect', 'circle', 'rect', 'circle', 'rect', 'circle', 'rect'];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '28vh', minHeight: 120, maxHeight: 240, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Pattern Detective scene">
        <defs>
          <linearGradient id="detectiveBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ede7f6" />
            <stop offset="100%" stopColor="#d1c4e9" />
          </linearGradient>
        </defs>
        {/* Background — semi-transparent overlay */}
        <rect width="400" height="220" fill="url(#detectiveBg)" opacity="0.35" />

        {/* Corkboard */}
        <rect x="20" y="30" width="360" height="120" fill="#c8a87a" rx={6} />
        <rect x="24" y="34" width="352" height="112" fill="#d4b896" rx={4} />

        {/* Pattern blocks in a row */}
        {Array.from({ length: 8 }).map((_, i) => {
          const x = 40 + i * 42;
          const y = 65;
          const isRevealed = i < revealed;
          const isNewest = isRevealed && i === revealed - 1;
          const color = PATTERN_COLORS[i];
          const shape = PATTERN_SHAPES[i];

          return (
            <g
              key={`${i}-${animKey}`}
              style={isNewest && lastResult === 'correct'
                ? { animation: 'starAppear 0.4s ease-out' }
                : undefined}
            >
              {/* Card background */}
              <rect x={x} y={y} width="34" height="34" rx={4} fill={isRevealed ? 'white' : '#b8a070'} stroke={isRevealed ? color : '#8d6e48'} strokeWidth={2} />
              {/* Shape inside card */}
              {isRevealed && shape === 'circle' && (
                <circle cx={x + 17} cy={y + 17} r={11} fill={color} />
              )}
              {isRevealed && shape === 'rect' && (
                <rect x={x + 7} y={y + 7} width="20" height="20" fill={color} rx={3} />
              )}
              {/* Mystery card with ? */}
              {!isRevealed && (
                <text x={x + 17} y={y + 22} textAnchor="middle" fontSize="16" fill="#8d6e48" fontWeight="bold">?</text>
              )}
            </g>
          );
        })}

        {/* Magnifying glass detective icon */}
        <g transform="translate(330, 30)" style={{ opacity: 0.5 }}>
          <circle cx="15" cy="15" r="13" fill="none" stroke="#7b1fa2" strokeWidth={4} />
          <line x1="24" y1="24" x2="35" y2="35" stroke="#7b1fa2" strokeWidth={5} strokeLinecap="round" />
        </g>

        {/* Detective hat */}
        <g transform="translate(30, 160)">
          <rect x="0" y="10" width="50" height="5" fill="#4a148c" rx={2} />
          <rect x="8" y="0" width="34" height="12" fill="#4a148c" rx={3} />
          <rect x="12" y="2" width="6" height="2" fill="#7b1fa2" />
        </g>

        {/* Progress label */}
        <text x="200" y="210" textAnchor="middle" fill="#4a148c88" fontSize="11" fontFamily="monospace">
          {revealed}/8 clues found
        </text>
      </svg>

      {lastResult === 'correct' && (
        <div key={`f-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]" />
      )}
      {lastResult === 'wrong' && (
        <div key={`s-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]" />
      )}
    </div>
  );
}

// ─── Nature Explorer ──────────────────────────────────────────────────────────

function NatureExplorerScene({ progress, lastResult, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; bgImage: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (lastResult) setAnimKey((k) => k + 1); }, [lastResult]);

  // Plant growth stages 0→1
  const stemHeight = Math.round(progress * 70);
  const hasLeaves = progress > 0.3;
  const hasBigLeaves = progress > 0.6;
  const hasFlower = progress >= 1;
  const leafBounce = lastResult === 'correct' ? { animation: 'vidya-bounce 0.5s ease-out' } : undefined;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '28vh', minHeight: 120, maxHeight: 240, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Nature Explorer scene">
        <defs>
          <linearGradient id="skyNature" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3f2fd" />
            <stop offset="60%" stopColor="#e8f5e9" />
            <stop offset="100%" stopColor="#c8e6c9" />
          </linearGradient>
        </defs>
        {/* Sky — semi-transparent overlay */}
        <rect width="400" height="220" fill="url(#skyNature)" opacity="0.3" />

        {/* Sun */}
        <circle cx="60" cy="45" r="22" fill="#ffd54f" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = deg * Math.PI / 180;
          return <line key={i} x1={60 + Math.cos(rad) * 25} y1={45 + Math.sin(rad) * 25}
            x2={60 + Math.cos(rad) * 33} y2={45 + Math.sin(rad) * 33}
            stroke="#ffd54f" strokeWidth={2.5} />;
        })}

        {/* Ground */}
        <ellipse cx="200" cy="190" rx="180" ry="35" fill="#66bb6a" />
        <ellipse cx="200" cy="185" rx="160" ry="20" fill="#81c784" />

        {/* Soil mound */}
        <ellipse cx="200" cy="188" rx="40" ry="14" fill="#795548" />
        <ellipse cx="200" cy="184" rx="35" ry="10" fill="#8d6e63" />

        {/* Plant stem */}
        {stemHeight > 0 && (
          <line
            x1="200" y1="184"
            x2="200" y2={184 - stemHeight}
            stroke="#2e7d32"
            strokeWidth={6}
            strokeLinecap="round"
            key={`stem-${animKey}`}
            style={lastResult === 'correct' ? { animation: 'scenePulse 0.4s ease-out' } : undefined}
          />
        )}

        {/* Small leaves at 30% */}
        {hasLeaves && (
          <g style={leafBounce}>
            <ellipse cx="185" cy={184 - stemHeight * 0.4} rx="14" ry="8" fill="#4caf50" transform={`rotate(-30, 185, ${184 - stemHeight * 0.4})`} />
            <ellipse cx="215" cy={184 - stemHeight * 0.5} rx="14" ry="8" fill="#43a047" transform={`rotate(30, 215, ${184 - stemHeight * 0.5})`} />
          </g>
        )}

        {/* Big leaves at 60% */}
        {hasBigLeaves && (
          <g style={leafBounce}>
            <ellipse cx="178" cy={184 - stemHeight * 0.7} rx="20" ry="11" fill="#388e3c" transform={`rotate(-40, 178, ${184 - stemHeight * 0.7})`} />
            <ellipse cx="222" cy={184 - stemHeight * 0.75} rx="20" ry="11" fill="#2e7d32" transform={`rotate(40, 222, ${184 - stemHeight * 0.75})`} />
          </g>
        )}

        {/* Flower at 100% */}
        {hasFlower && (
          <g style={{ animation: 'starAppear 0.6s ease-out' }}>
            {/* Petals */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = deg * Math.PI / 180;
              const px = 200 + Math.cos(rad) * 14;
              const py = 184 - stemHeight + Math.sin(rad) * 14;
              return <circle key={i} cx={px} cy={py} r={9} fill="#f06292" opacity={0.9} />;
            })}
            {/* Center */}
            <circle cx="200" cy={184 - stemHeight} r="10" fill="#ffd54f" />
          </g>
        )}

        {/* Clouds */}
        <ellipse cx="300" cy="35" rx="35" ry="16" fill="white" opacity={0.85} />
        <ellipse cx="330" cy="28" rx="25" ry="14" fill="white" opacity={0.85} />

        {/* Butterfly (appears when growing) */}
        {progress > 0.5 && (
          <g transform="translate(150, 100)" style={{ animation: 'vidya-bounce 2s ease-in-out infinite' }}>
            <ellipse cx="-8" cy="0" rx="12" ry="8" fill="#ce93d8" opacity={0.8} />
            <ellipse cx="8" cy="0" rx="12" ry="8" fill="#f48fb1" opacity={0.8} />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#333" strokeWidth={1.5} />
          </g>
        )}

        {/* Progress label */}
        <text x="200" y="215" textAnchor="middle" fill="#1b5e2077" fontSize="11" fontFamily="monospace">
          {Math.round(progress * 100)}% grown
        </text>
      </svg>

      {lastResult === 'correct' && (
        <div key={`f-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]" />
      )}
      {lastResult === 'wrong' && (
        <div key={`s-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]" />
      )}
    </div>
  );
}

// ─── Generic Star Scene (fallback) ───────────────────────────────────────────

function StarScene({ progress, lastResult, chapter, bgImage }: { progress: number; lastResult: 'correct' | 'wrong' | null; chapter: string; bgImage: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (lastResult) setAnimKey((k) => k + 1); }, [lastResult]);

  const starsEarned = Math.round(progress * 5);

  // Chapter-based background colors
  const bgColors: Record<string, [string, string]> = {
    'Pattern Detective': ['#ede7f6', '#d1c4e9'],
    'Nature Explorer': ['#e8f5e9', '#c8e6c9'],
  };
  const [bg1, bg2] = bgColors[chapter] ?? ['#fff8e1', '#ffe082'];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '28vh', minHeight: 120, maxHeight: 240, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <svg viewBox="0 0 400 220" className="h-full w-full" role="img" aria-label="Quest progress scene">
        <defs>
          <linearGradient id="bgGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bg1} />
            <stop offset="100%" stopColor={bg2} />
          </linearGradient>
        </defs>
        <rect width="400" height="220" fill="url(#bgGrad2)" opacity="0.35" />

        {/* Central star cluster */}
        {Array.from({ length: 5 }).map((_, i) => {
          const x = 80 + i * 60;
          const y = 100;
          const earned = i < starsEarned;
          const isNewest = earned && i === starsEarned - 1;

          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              {/* Glow for earned stars */}
              {earned && <circle cx="0" cy="0" r="28" fill="#ffd54f" opacity={0.2} />}
              <text
                fontSize={earned ? 42 : 36}
                fill={earned ? '#ffd54f' : '#cfd8dc'}
                textAnchor="middle"
                dominantBaseline="middle"
                style={isNewest && lastResult === 'correct'
                  ? { animation: 'starAppear 0.6s ease-out' } : undefined}
              >
                {earned ? '★' : '☆'}
              </text>
              {earned && (
                <text fontSize="10" fill="#f57f17" textAnchor="middle" y="28" fontWeight="bold">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}

        {/* Chapter title */}
        <text x="200" y="175" textAnchor="middle" fill="#33333377" fontSize="13" fontFamily="sans-serif">
          {chapter}
        </text>
        <text x="200" y="210" textAnchor="middle" fill="#33333555" fontSize="11" fontFamily="monospace">
          {starsEarned}/5 stars collected
        </text>
      </svg>

      {lastResult === 'correct' && (
        <div key={`f-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/20 animate-[correctFlash_0.5s_ease-out]" />
      )}
      {lastResult === 'wrong' && (
        <div key={`s-${animKey}`} className="pointer-events-none absolute inset-0 rounded-2xl bg-red-400/20 animate-[wrongShake_0.4s_ease-out]" />
      )}
    </div>
  );
}
