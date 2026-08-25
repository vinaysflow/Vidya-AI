/**
 * Prototype A — PixiJS (2D WebGL, faked 2.5D).
 *
 * A parallax dusk world with a code-drawn reactive hero and a particle burst
 * on "correct". All placeholder art is drawn procedurally with Pixi Graphics
 * (throwaway, per the fast bake-off) — Pixi's real strength is textured
 * sprites, which a real build would drop in here.
 */

import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite, type Ticker } from 'pixi.js';
import { useBeat, type HeroState } from './beat';
import { BeatOverlay } from './BeatOverlay';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

class PixiScene {
  app = new Application();
  private far = new Container();
  private mid = new Container();
  private heroLayer = new Container();
  private fx = new Container();
  private hero = new Container();
  private stars: Graphics[] = [];
  private particles: Particle[] = [];
  private pointer = { x: 0, y: 0 };
  private heroState: HeroState = 'idle';
  private t = 0;
  private hop = 0;
  private destroyed = false;
  private onPointerMove = (e: PointerEvent) => {
    const r = this.app.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };

  async init(el: HTMLDivElement) {
    await this.app.init({
      resizeTo: el,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    el.appendChild(this.app.canvas);
    this.app.stage.addChild(this.far, this.mid, this.heroLayer, this.fx);

    this.buildStars();
    this.buildHills();
    this.buildHero();

    this.app.canvas.addEventListener('pointermove', this.onPointerMove);
    this.app.renderer.on('resize', () => this.layout());
    this.layout();
    void this.loadHeroSprite();
    this.app.ticker.add(this.update);
  }

  private async loadHeroSprite() {
    try {
      const tex = await Assets.load('/proto/hero.png');
      if (this.destroyed || !tex) return;
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1); // stand on a point (bottom-center)
      const targetHeight = 340;
      sprite.scale.set(targetHeight / tex.height);
      sprite.y = 70; // feet sit just below the layer origin (on the ground)
      const shadow = new Graphics().ellipse(0, 66, 72, 16).fill({ color: 0x000000, alpha: 0.3 });
      this.hero.removeChildren(); // swap out the procedural blob fallback
      this.hero.addChild(shadow, sprite);
    } catch {
      /* keep the drawn blob fallback */
    }
  }

  private buildStars() {
    for (let i = 0; i < 40; i++) {
      const s = new Graphics().circle(0, 0, Math.random() * 1.6 + 0.6).fill(0xffffff);
      s.alpha = Math.random() * 0.6 + 0.2;
      this.far.addChild(s);
      this.stars.push(s);
    }
  }

  private buildHills() {
    const farHill = new Graphics().roundRect(-100, 0, 2000, 700, 320).fill(0x2a1f57);
    this.far.addChild(farHill);
    (farHill as Graphics & { _isHill?: boolean })._isHill = true;
    const midHill = new Graphics().roundRect(-100, 0, 2000, 600, 280).fill(0x3b2a6b);
    this.mid.addChild(midHill);
    const ground = new Graphics().rect(-100, 0, 2000, 400).fill(0x241a4d);
    this.mid.addChild(ground);
  }

  private buildHero() {
    this.hero.removeChildren();
    // contact shadow
    const shadow = new Graphics().ellipse(0, 96, 60, 14).fill({ color: 0x000000, alpha: 0.28 });
    // body
    const body = new Graphics().roundRect(-46, -10, 92, 110, 38).fill(0x2de2e6);
    const belly = new Graphics().roundRect(-30, 28, 60, 60, 26).fill(0xeafdff);
    // head
    const head = new Graphics().circle(0, -54, 50).fill(0x36e4da);
    const eyeL = new Graphics().circle(-17, -58, 9).fill(0x10203a);
    const eyeR = new Graphics().circle(17, -58, 9).fill(0x10203a);
    const glintL = new Graphics().circle(-14, -61, 3).fill(0xffffff);
    const glintR = new Graphics().circle(20, -61, 3).fill(0xffffff);
    const smile = new Graphics().roundRect(-12, -40, 24, 8, 4).fill(0x10203a);
    // little gold crest
    const crest = new Graphics().circle(0, -104, 9).fill(0xffc857);
    this.hero.addChild(shadow, body, belly, head, eyeL, eyeR, glintL, glintR, smile, crest);
    this.heroLayer.addChild(this.hero);
  }

  private layout() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    // stars scattered across the top 60%
    this.stars.forEach((s, i) => {
      s.x = (i * 97.3) % w;
      s.y = ((i * 53.7) % (h * 0.6));
    });
    this.far.y = h * 0.42;
    this.mid.y = h * 0.6;
    this.heroLayer.x = w / 2;
    this.heroLayer.y = h * 0.66;
    const scale = Math.min(1.3, Math.max(0.7, h / 720));
    this.heroLayer.scale.set(scale);
  }

  setHeroState(state: HeroState) {
    if (state === 'celebrating' && this.heroState !== 'celebrating') {
      this.burst();
      this.hop = 1;
    }
    this.heroState = state;
  }

  private burst() {
    const colors = [0x2de2e6, 0xffc857, 0xff6b6b, 0x4ade80, 0xffffff];
    for (let i = 0; i < 26; i++) {
      const g = new Graphics().circle(0, 0, Math.random() * 5 + 3).fill(colors[i % colors.length]);
      g.x = this.heroLayer.x;
      g.y = this.heroLayer.y - 60;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 3;
      this.fx.addChild(g);
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        life: 0,
        maxLife: Math.random() * 50 + 40,
      });
    }
  }

  private update = (ticker: Ticker) => {
    const dt = ticker.deltaTime;
    this.t += dt;

    // parallax from pointer
    this.far.x = -this.pointer.x * 14;
    this.mid.x = -this.pointer.x * 30;

    // twinkle
    this.stars.forEach((s, i) => {
      s.alpha = 0.3 + 0.3 * Math.sin(this.t * 0.05 + i);
    });

    // hero animation
    let bob = 0;
    let rot = 0;
    let squash = 1;
    if (this.heroState === 'idle') {
      bob = Math.sin(this.t * 0.06) * 6;
      squash = 1 + Math.sin(this.t * 0.06) * 0.02;
    } else if (this.heroState === 'thinking') {
      bob = Math.sin(this.t * 0.16) * 3;
      rot = Math.sin(this.t * 0.08) * 0.08;
    } else if (this.heroState === 'puzzled') {
      rot = Math.sin(this.t * 0.1) * 0.16;
      bob = Math.sin(this.t * 0.05) * 3;
    } else if (this.heroState === 'celebrating') {
      bob = Math.sin(this.t * 0.4) * 4;
    }
    if (this.hop > 0) {
      this.hop = Math.max(0, this.hop - dt * 0.03);
      bob -= Math.sin(this.hop * Math.PI) * 90;
      squash = 1 + Math.sin(this.hop * Math.PI) * 0.12;
    }
    this.hero.y = bob;
    this.hero.rotation = rot;
    this.hero.scale.set(1, squash);

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.vy += dt * 0.35; // gravity
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.fx.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  };

  destroy() {
    this.destroyed = true;
    try {
      this.app.canvas?.removeEventListener('pointermove', this.onPointerMove);
    } catch {
      /* noop */
    }
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* noop */
    }
  }
}

export function PixiPrototype() {
  const beat = useBeat();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);

  useEffect(() => {
    const scene = new PixiScene();
    sceneRef.current = scene;
    if (mountRef.current) void scene.init(mountRef.current);
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setHeroState(beat.heroState);
  }, [beat.heroState]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #160f30 0%, #241a4d 55%, #3b2a6b 100%)' }}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <BeatOverlay engineLabel="PixiJS · 2.5D" beat={beat} />
    </div>
  );
}
