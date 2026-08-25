/**
 * Prototype B — react-three-fiber (true 3D) with a self-hosted rigged human.
 *
 * The avatar GLB is bundled locally (public/proto/hero.glb) so it always loads
 * — no dependency on an external avatar CDN at runtime (the Ready Player Me CDN
 * was unreachable, which is why the fallback blob showed). The model's built-in
 * skeletal IDLE plays continuously, so the body itself animates (breathing,
 * limbs) — the thing a 2D sprite can't do. A jump+spin punctuates "correct".
 *
 * DROP-IN SLOT: to show a different avatar (e.g. the RM model from an
 * image-to-3D tool like Meshy/Tripo), just overwrite public/proto/hero.glb and
 * refresh. The loader auto-normalizes scale + pivot, so any source GLB fits the
 * scene without code changes.
 */

import { Suspense, useEffect, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Sparkles, ContactShadows, RoundedBox } from '@react-three/drei';
import type { Group, Mesh, Material } from 'three';
import { MathUtils, Box3, Vector3, MeshPhysicalMaterial } from 'three';
import { useBeat, type HeroState } from './beat';
import { BeatOverlay } from './BeatOverlay';

const HERO_URL = '/proto/hero.glb';

const TARGET_HEIGHT = 1.9; // world units the avatar should stand at, regardless of source

function HumanHero({ state }: { state: HeroState }) {
  const group = useRef<Group>(null); // animated wrapper (jump / spin / lean)
  const fit = useRef<Group>(null); // normalization wrapper (scale + recenter)
  const { scene, animations } = useGLTF(HERO_URL);
  const { actions } = useAnimations(animations, group);
  const hasClip = useRef(false);
  const t = useRef(0);
  const hop = useRef(0);
  const prev = useRef<HeroState>('idle');

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // Untextured image-to-3D meshes (e.g. Hunyuan3D shape output) ship without
      // materials/maps. Give them a polished porcelain-figurine look: a clearcoat
      // sheen over a soft warm body so the scene's colored rim lights read as a
      // premium collectible statue, not a flat default white.
      const mat = m.material as (Material & { map?: unknown }) | undefined;
      const hasTexture = mat && !Array.isArray(mat) && mat.map;
      if (!hasTexture) {
        m.material = new MeshPhysicalMaterial({
          color: '#efe7ff',
          roughness: 0.42,
          metalness: 0.08,
          clearcoat: 0.7,
          clearcoatRoughness: 0.35,
          sheen: 0.5,
          sheenColor: '#b79bff',
        });
      }
    });
  }, [scene]);

  // Source-agnostic normalization: any dropped GLB (Meshy / Tripo / RPM) comes
  // in arbitrary scale + pivot. Fit it to a fixed height, center it on x/z, and
  // plant its feet at y=0 so it never shows up giant, off-center, or sunk.
  useEffect(() => {
    const f = fit.current;
    if (!f) return;
    f.scale.set(1, 1, 1);
    f.position.set(0, 0, 0);
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    f.scale.setScalar(s);
    f.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }, [scene]);

  // Play a baked skeletal idle if the model has one; otherwise we add a gentle
  // procedural breathing bob below so a static converted mesh isn't frozen.
  useEffect(() => {
    const idle = actions['Idle'] ?? actions['idle'] ?? Object.values(actions)[0];
    if (idle) {
      hasClip.current = true;
      idle.reset().fadeIn(0.4).play();
    }
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame((_, delta) => {
    t.current += delta;
    const g = group.current;
    if (!g) return;

    if (state === 'celebrating' && prev.current !== 'celebrating') hop.current = 1;
    prev.current = state;

    let y = -0.95;
    if (hop.current > 0) {
      hop.current = Math.max(0, hop.current - delta * 1.4);
      y += Math.sin(hop.current * Math.PI) * 0.7;
    }
    if (!hasClip.current && state !== 'celebrating') {
      y += Math.sin(t.current * 1.6) * 0.04; // breathing bob for non-animated GLBs
    }
    g.position.y = y;

    if (state === 'celebrating') {
      g.rotation.y += delta * 4; // joyful spin punctuation
      g.rotation.z = 0;
    } else if (state === 'puzzled') {
      g.rotation.y += delta * 0.25; // keep slow turntable while it leans/ponders
      g.rotation.z = Math.sin(t.current * 2.6) * 0.1;
    } else {
      g.rotation.y += delta * 0.35; // gentle turntable to show off the 3D form
      g.rotation.z = MathUtils.lerp(g.rotation.z, 0, 0.1);
    }
  });

  return (
    <group ref={group} position={[0, -0.95, 0]}>
      <group ref={fit}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
useGLTF.preload(HERO_URL);

/** Fallback hero (primitive) shown only if the GLB can't load. */
function PrimitiveHero({ state }: { state: HeroState }) {
  const group = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    const g = group.current;
    if (!g) return;
    g.position.y = state === 'idle' ? Math.sin(t.current * 1.6) * 0.06 : 0;
    g.rotation.y = state === 'celebrating' ? t.current * 3 : Math.sin(t.current * 0.5) * 0.15;
  });
  return (
    <group ref={group}>
      <RoundedBox args={[1.05, 1.25, 0.85]} radius={0.32} smoothness={4} position={[0, 0.1, 0]} castShadow>
        <meshStandardMaterial color="#2de2e6" roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.52, 32, 32]} />
        <meshStandardMaterial color="#36e4da" roughness={0.4} />
      </mesh>
    </group>
  );
}

class GLTFBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

function CameraParallax() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x = MathUtils.lerp(camera.position.x, pointer.x * 1.0, 0.05);
    camera.position.y = MathUtils.lerp(camera.position.y, 0.8 + pointer.y * 0.4, 0.05);
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

export function R3FPrototype() {
  const beat = useBeat();
  const celebrating = beat.heroState === 'celebrating';

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.8, 4.8], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={['#160f30']} />
        <fog attach="fog" args={['#241a4d', 8, 20]} />

        <ambientLight intensity={0.5} />
        <hemisphereLight intensity={0.4} color="#cfd8ff" groundColor="#2a1f57" />
        <directionalLight position={[4, 7, 4]} intensity={2.2} castShadow color="#fff4e0" />
        <pointLight position={[-5, 3, 2]} intensity={45} color="#7c5cff" />
        <pointLight position={[5, 2, -2]} intensity={30} color="#2de2e6" />
        {/* warm back rim to carve the silhouette out of the dark stage */}
        <spotLight position={[0, 5.5, -5]} intensity={70} angle={0.7} penumbra={0.9} color="#ffcaa0" />

        <GLTFBoundary fallback={<PrimitiveHero state={beat.heroState} />}>
          <Suspense fallback={null}>
            <HumanHero state={beat.heroState} />
          </Suspense>
        </GLTFBoundary>

        {celebrating && (
          <Sparkles count={60} scale={[5, 5, 4]} size={6} speed={0.9} color="#ffc857" position={[0, 1.2, 0]} />
        )}

        <ContactShadows position={[0, -0.95, 0]} opacity={0.6} scale={9} blur={2.6} far={4} color="#000000" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} receiveShadow>
          <circleGeometry args={[10, 48]} />
          <meshStandardMaterial color="#2a1f57" roughness={0.9} />
        </mesh>

        <CameraParallax />
      </Canvas>
      <BeatOverlay engineLabel="react-three-fiber · 3D" beat={beat} />
    </div>
  );
}
