/* Wave 1 — render overhaul, gallery room, mermaid idle, loss glitch.
   Attached as a side-extension to the TrappedWorld monolith so we can
   layer new systems without rewriting the 7,433-line class. The single
   entry `applyWave1(world)` is called once at the end of the world's
   constructor. All helpers below operate on the world instance directly:
   they read world.scene/camera/renderer/composer/roomRoot and push new
   objects into the scene. */

import * as THREE from 'three';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ============================================================
   ENTRY
   ============================================================ */
export function applyWave1(world) {
  try {
    enhanceLighting(world);
    configureShadows(world);
    thickenFog(world);
    attachCaustics(world);
    buildParticles(world);
    rebuildComposer(world);
    attachLossGlitch(world);
    attachMermaidIdle(world);
    attachHeartbeatAndHum(world);
    attachGallery(world);
    installLoopHook(world);
  } catch (err) {
    console.warn('[Wave1] partial init failure:', err);
  }
}

/* ============================================================
   LIGHTING — moon + warm table lamps + rim
   ============================================================ */
function enhanceLighting(world) {
  // Moon — cool, directional, primary shadow caster.
  const moon = new THREE.DirectionalLight(0xb8d4ff, 0.85);
  moon.position.set(14, 28, 10);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 80;
  moon.shadow.camera.left = -38;
  moon.shadow.camera.right = 38;
  moon.shadow.camera.top = 38;
  moon.shadow.camera.bottom = -38;
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.04;
  world.scene.add(moon);
  world.scene.add(moon.target);
  world.__moon = moon;

  // Hemisphere for organic fill (sky=pale cyan, ground=inky blue).
  const hemi = new THREE.HemisphereLight(0x3a5a78, 0x040c14, 0.35);
  world.scene.add(hemi);

  // Warm table lamps — one flickering gold PointLight above each table.
  const tablePositions = collectTableRingPositions();
  world.__tableLamps = [];
  tablePositions.forEach((p, i) => {
    const lamp = new THREE.PointLight(0xffb87a, 0.9, 9, 2.1);
    lamp.position.set(p.x, 3.2, p.z);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(512, 512);
    lamp.shadow.camera.near = 0.2;
    lamp.shadow.camera.far = 12;
    lamp.__basePhase = Math.random() * Math.PI * 2;
    world.scene.add(lamp);
    world.__tableLamps.push(lamp);
  });

  // Subtle stage backlight
  const stage = new THREE.SpotLight(0xffd4a8, 1.3, 16, Math.PI * 0.28, 0.55, 1.6);
  stage.position.set(0, 9, 0);
  stage.target.position.set(0, 1.4, 0);
  world.scene.add(stage);
  world.scene.add(stage.target);
  world.__stageLight = stage;
}

function collectTableRingPositions() {
  const TABLE_RING = 15;
  const out = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.PI * 0.1;
    out.push({ x: Math.cos(a) * TABLE_RING, z: Math.sin(a) * TABLE_RING });
  }
  return out;
}

/* ============================================================
   SHADOWS — opt-in per mesh via scene traverse
   ============================================================ */
function configureShadows(world) {
  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Traverse all meshes currently in the scene and flag them.
  // Heuristics: meshes near the ground plane receive; meshes above receive+cast.
  world.scene.traverse(obj => {
    if (!obj.isMesh) return;
    const y = obj.position.y;
    const h = obj.geometry && obj.geometry.boundingBox
      ? (obj.geometry.boundingBox.max.y - obj.geometry.boundingBox.min.y)
      : 1;
    if (y < 0.1 && h < 0.5) {
      // Looks like a floor plane
      obj.receiveShadow = true;
    } else if (y < 2.5) {
      // Floor-level objects: both
      obj.castShadow = true;
      obj.receiveShadow = true;
    } else {
      // Ceiling/columns: cast only
      obj.castShadow = true;
    }
  });
}

/* ============================================================
   FOG — thicker volumetric-feel FogExp2
   ============================================================ */
function thickenFog(world) {
  // Slightly richer fog blend for depth cueing.
  world.scene.fog = new THREE.FogExp2(0x0a2340, 0.038);
  // Keep background darker so fog reads.
  if (world.scene.background && world.scene.background.isColor) {
    world.scene.background.setHex(0x020510);
  }
}

/* ============================================================
   CAUSTICS — animated shader overlay, applied to floor meshes
   ============================================================ */
function attachCaustics(world) {
  // The monolith already ships a voronoi caustic ShaderMaterial on a separate
  // floor overlay (world.causticMat). We skip adding our own patch to avoid
  // doubling the effect, and just expose a shared time uniform so tickWave1
  // can drive it more steadily.
  const uTime = { value: 0 };
  world.__causticUTime = uTime;
}

function buildCausticTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 512);
  // Layered radial blobs create Voronoi-ish caustic feel.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 64; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 20 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.35 + Math.random() * 0.5;
    g.addColorStop(0, `rgba(180,220,255,${a})`);
    g.addColorStop(0.6, 'rgba(120,160,200,0.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  return tex;
}

function patchCausticShader(material, tex, uTime) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCausticMap = { value: tex };
    shader.uniforms.uTime = uTime;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uCausticMap;
         uniform float uTime;`
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         vec2 cUV = vWorldPosition.xz * 0.18 + vec2(uTime * 0.04, uTime * 0.03);
         vec2 cUV2 = vWorldPosition.xz * 0.11 - vec2(uTime * 0.025, uTime * 0.015);
         float c1 = texture2D(uCausticMap, cUV).r;
         float c2 = texture2D(uCausticMap, cUV2).r;
         float c = c1 * c2 * 2.2;
         gl_FragColor.rgb += vec3(0.18, 0.36, 0.48) * c;`
      );
    // Need worldPosition varying — patch vertex shader to pass it.
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPosition;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldPosition = worldPosition.xyz;`
      );
    // vWorldPosition is declared in fragment via varying
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWorldPosition;
       uniform sampler2D uCausticMap;
       uniform float uTime;`
    );
  };
  material.needsUpdate = true;
}

/* ============================================================
   PARTICLES — bubbles (InstancedMesh) + sediment (Points)
   ============================================================ */
function buildParticles(world) {
  // Bubbles: 200 small spheres rising with drift, billboard-ish via
  // Sprite. Using Points with custom shader is cheaper than InstancedMesh
  // for this count and looks right.
  const BUBBLE_COUNT = 200;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(BUBBLE_COUNT * 3);
  const seeds = new Float32Array(BUBBLE_COUNT);
  const sizes = new Float32Array(BUBBLE_COUNT);
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 26;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.random() * 18;
    positions[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = Math.random() * 100;
    sizes[i] = 6 + Math.random() * 14;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const bubbleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: buildBubbleTex() },
    },
    vertexShader: `
      attribute float seed;
      attribute float size;
      uniform float uTime;
      varying float vSeed;
      void main() {
        vSeed = seed;
        vec3 p = position;
        float t = uTime + seed * 2.0;
        p.y = mod(position.y + t * 0.45, 18.0);
        p.x += sin(t * 0.7 + seed) * 0.3;
        p.z += cos(t * 0.6 + seed * 1.3) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (250.0 / -mv.z);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying float vSeed;
      void main() {
        vec4 tex = texture2D(uTex, gl_PointCoord);
        if (tex.a < 0.05) discard;
        gl_FragColor = vec4(0.75, 0.92, 1.0, 0.35) * tex;
      }
    `,
  });
  const bubbles = new THREE.Points(geom, bubbleMat);
  bubbles.frustumCulled = false;
  world.scene.add(bubbles);
  world.__bubbles = bubbles;
  world.__bubbleMat = bubbleMat;

  // Sediment (slow drifting motes)
  const SED_COUNT = 500;
  const sedGeom = new THREE.BufferGeometry();
  const sedPos = new Float32Array(SED_COUNT * 3);
  const sedSeed = new Float32Array(SED_COUNT);
  for (let i = 0; i < SED_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 32;
    sedPos[i * 3] = Math.cos(a) * r;
    sedPos[i * 3 + 1] = Math.random() * 18;
    sedPos[i * 3 + 2] = Math.sin(a) * r;
    sedSeed[i] = Math.random() * 100;
  }
  sedGeom.setAttribute('position', new THREE.BufferAttribute(sedPos, 3));
  sedGeom.setAttribute('seed', new THREE.BufferAttribute(sedSeed, 1));

  const sedMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float seed;
      uniform float uTime;
      void main() {
        vec3 p = position;
        float t = uTime + seed * 3.0;
        p.x += sin(t * 0.18 + seed * 0.7) * 1.5;
        p.y += sin(t * 0.09 + seed * 1.3) * 0.8;
        p.z += cos(t * 0.21 + seed * 0.4) * 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 2.0 + (120.0 / -mv.z);
      }
    `,
    fragmentShader: `
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * 0.28;
        gl_FragColor = vec4(0.6, 0.7, 0.82, a);
      }
    `,
  });
  const sediment = new THREE.Points(sedGeom, sedMat);
  sediment.frustumCulled = false;
  world.scene.add(sediment);
  world.__sediment = sediment;
  world.__sedimentMat = sedMat;
}

function buildBubbleTex() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(220,240,255,0.35)');
  g.addColorStop(0.65, 'rgba(180,220,255,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(24, 22, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

/* ============================================================
   COMPOSER — SSAO + Bokeh + Vignette + loss-glitch pass
   ============================================================ */
function rebuildComposer(world) {
  const { renderer, scene, camera } = world;
  const composer = new EffectComposer(renderer);
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  composer.setSize(w, h);

  const render = new RenderPass(scene, camera);
  composer.addPass(render);

  // SSAO — gentle, not crunchy
  const ssao = new SSAOPass(scene, camera, w, h);
  ssao.kernelRadius = 4;
  ssao.minDistance = 0.002;
  ssao.maxDistance = 0.12;
  ssao.output = SSAOPass.OUTPUT.Default;
  composer.addPass(ssao);
  world.__ssao = ssao;

  // Bloom — keep the existing underwater glow
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.7, 0.3);
  composer.addPass(bloom);
  world.__bloom = bloom;

  // Depth of field — focus at nearest interactable
  const bokeh = new BokehPass(scene, camera, {
    focus: 6.0,
    aperture: 0.00015,
    maxblur: 0.006,
    width: w,
    height: h,
  });
  composer.addPass(bokeh);
  world.__bokeh = bokeh;

  // Underwater chromatic aberration + vignette (bound to breath via uniform)
  const vignette = new ShaderPass(makeVignetteShader());
  composer.addPass(vignette);
  world.__vignette = vignette;

  // Loss-glitch pass (disabled by default; triggered for ~300ms)
  const glitch = new GlitchPass();
  glitch.enabled = false;
  glitch.goWild = false;
  composer.addPass(glitch);
  world.__glitch = glitch;

  // Replace the existing composer
  if (world.composer && world.composer !== composer) {
    // best effort dispose
    try { world.composer.passes && world.composer.passes.forEach(p => p.dispose && p.dispose()); } catch {}
  }
  world.composer = composer;
}

function makeVignetteShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uBreath: { value: 200.0 },
      uTime: { value: 0.0 },
      uAberration: { value: 0.0025 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uBreath;
      uniform float uTime;
      uniform float uAberration;
      varying vec2 vUv;

      void main() {
        vec2 c = vUv - 0.5;
        float ab = uAberration * (1.0 + (1.0 - smoothstep(0.0, 50.0, uBreath)) * 2.5);
        vec4 r = texture2D(tDiffuse, vUv + c * ab);
        vec4 g = texture2D(tDiffuse, vUv);
        vec4 b = texture2D(tDiffuse, vUv - c * ab);
        vec4 col = vec4(r.r, g.g, b.b, 1.0);

        // Vignette tightens as breath drops
        float dist = length(c);
        float vignetteR = mix(0.98, 0.55, 1.0 - smoothstep(0.0, 60.0, uBreath));
        float v = smoothstep(vignetteR, 0.2, dist);
        col.rgb *= v;

        // Low-breath desat + red tint
        float low = 1.0 - smoothstep(0.0, 50.0, uBreath);
        float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        col.rgb = mix(col.rgb, vec3(lum), low * 0.55);
        col.rgb = mix(col.rgb, col.rgb * vec3(1.15, 0.6, 0.55), low * 0.6);

        // Subtle underwater hue shift
        col.rgb = mix(col.rgb, col.rgb * vec3(0.78, 0.95, 1.08), 0.25);

        gl_FragColor = col;
      }
    `,
  };
}

/* ============================================================
   LOSS GLITCH — public method triggerLossGlitch(amount)
   ============================================================ */
function attachLossGlitch(world) {
  world.triggerLossGlitch = (amount) => {
    if (!world.__glitch) return;
    const severity = Math.max(0.3, Math.min(1.5, (amount || 30) / 60));
    world.__glitch.enabled = true;
    world.__glitch.goWild = severity > 1.1;
    const duration = 220 + severity * 250;
    clearTimeout(world.__glitchTimer);
    world.__glitchTimer = setTimeout(() => {
      if (world.__glitch) world.__glitch.enabled = false;
    }, duration);
  };
}

/* ============================================================
   MERMAID IDLE — breathing + hair drift + eye track
   ============================================================ */
function attachMermaidIdle(world) {
  // Collect existing mermaid root nodes (Siren altar, Mirror NPC, Curtain
  // figures). Their references are stored as world.sirenAltar etc.
  world.__mermaidIdleTargets = [];
  const candidates = [
    world.sirenAltar, world.mirrorNpc, world.merchant,
    world.charmkeeper, world.muse, world.confessor,
  ];
  candidates.forEach(g => {
    if (!g || !g.isObject3D) return;
    world.__mermaidIdleTargets.push({
      group: g,
      basePhase: Math.random() * Math.PI * 2,
      baseY: g.position.y,
    });
  });
}

function tickMermaidIdle(world, t) {
  const cam = world.camera;
  if (!world.__mermaidIdleTargets) return;
  for (const m of world.__mermaidIdleTargets) {
    const g = m.group;
    if (!g) continue;
    // Breathing: gentle sway in Y scale
    const breath = 1.0 + Math.sin(t * 0.9 + m.basePhase) * 0.015;
    g.scale.y = breath;
    // Gentle bob
    g.position.y = m.baseY + Math.sin(t * 0.6 + m.basePhase) * 0.04;
    // Soft rotation sway
    g.rotation.z = Math.sin(t * 0.45 + m.basePhase) * 0.018;
    // Head look at camera (damped) — find a child labeled 'head' if any
    const head = g.getObjectByName && g.getObjectByName('head');
    if (head && cam) {
      const target = cam.position.clone();
      head.lookAt(target);
    }
  }
}

/* ============================================================
   HEARTBEAT + FRAGMENT HUM — invoke audio each frame
   ============================================================ */
function attachHeartbeatAndHum(world) {
  // no init needed — state lives on the audio instance.
}

function tickAudioFeedback(world) {
  const audio = window.__trappedAudio;
  if (!audio) return;
  // Heartbeat bpm from breath
  const breath = (typeof window.__trappedBreath === 'number') ? window.__trappedBreath : 200;
  let bpm = 0;
  if (breath < 15) bpm = 100;
  else if (breath < 30) bpm = 80;
  else if (breath < 50) bpm = 60;
  if (audio.setHeartbeatBpm) audio.setHeartbeatBpm(bpm);

  // Fragment hum — nearest uncollected fragment distance
  if (world.fragmentMeshes && world.camera && audio.setFragmentHum) {
    const collected = new Set(world.__collectedFragmentIds || []);
    const camP = world.camera.position;
    let min = Infinity;
    for (const f of world.fragmentMeshes) {
      if (!f || !f.position) continue;
      if (f.userData && collected.has(f.userData.id)) continue;
      const d = f.position.distanceTo(camP);
      if (d < min) min = d;
    }
    audio.setFragmentHum(min === Infinity ? 99 : min);
  }
}

/* ============================================================
   GALLERY ROOM — built eagerly, portal added to NE wall
   ============================================================ */
function attachGallery(world) {
  // Defer building until the existing casino room has finished mounting.
  // We inject a portal mesh that teleports the player to the gallery.
  // Gallery lives inside the roomRoot so it disposes with the room.
  if (world.currentRoom !== 'casino') return;

  const gallery = buildGalleryRoom(world);
  world.__gallery = gallery;
  if (gallery) world.roomRoot.add(gallery);
}

function buildGalleryRoom(world) {
  const root = new THREE.Group();
  root.position.set(38, 0, -12); // off the NE wall

  // Floor — marble-esque
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a2018,
    roughness: 0.4,
    metalness: 0.15,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Walls (3 solid, 1 with entrance)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0e1c28,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x05101a,
    emissiveIntensity: 0.15,
  });
  const mkWall = (w, h, x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    return m;
  };
  root.add(mkWall(24, 8, 0, -8)); // back
  root.add(mkWall(16, 8, -12, 0, Math.PI / 2)); // left
  root.add(mkWall(16, 8, 12, 0, -Math.PI / 2)); // right
  root.add(mkWall(24, 8, 0, 8, Math.PI)); // front (away from entrance)

  // Coffered ceiling
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x1a1208,
    roughness: 0.7,
    metalness: 0.2,
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8;
  ceil.receiveShadow = true;
  root.add(ceil);

  // Dim ambient in gallery
  const amb = new THREE.AmbientLight(0x1a1a1e, 0.4);
  amb.position.set(0, 6, 0);
  root.add(amb);

  // 10 paintings — placed along 3 walls (4 back, 3 left, 3 right)
  const paintings = getPaintingManifest();
  const slots = [
    // back wall (4 across)
    { x: -9, y: 3.2, z: -7.95, ry: 0, w: 3.2, h: 4.0 },
    { x: -3, y: 3.2, z: -7.95, ry: 0, w: 3.2, h: 4.0 },
    { x: 3,  y: 3.2, z: -7.95, ry: 0, w: 3.2, h: 4.0 },
    { x: 9,  y: 3.2, z: -7.95, ry: 0, w: 3.2, h: 4.0 },
    // left wall
    { x: -11.95, y: 3.2, z: -4, ry: Math.PI / 2, w: 3.0, h: 4.0 },
    { x: -11.95, y: 3.2, z:  4, ry: Math.PI / 2, w: 3.0, h: 4.0 },
    // right wall
    { x:  11.95, y: 3.2, z: -4, ry: -Math.PI / 2, w: 3.0, h: 4.0 },
    { x:  11.95, y: 3.2, z:  4, ry: -Math.PI / 2, w: 3.0, h: 4.0 },
    // front wall (flanking entrance)
    { x: -7, y: 3.2, z:  7.95, ry: Math.PI, w: 3.0, h: 4.0 },
    { x:  7, y: 3.2, z:  7.95, ry: Math.PI, w: 3.0, h: 4.0 },
  ];
  const cursedIndex = paintings.findIndex(p => p.cursed);
  const paintingMeshes = [];
  paintings.slice(0, 10).forEach((p, i) => {
    const slot = slots[i];
    const mesh = buildPainting(p, slot);
    paintingMeshes.push({ mesh, meta: p, slot });
    root.add(mesh);
    // Spotlight per painting
    const spot = new THREE.SpotLight(0xffe8c4, 1.1, 8, Math.PI * 0.3, 0.4, 1.4);
    spot.position.set(slot.x + Math.sin(slot.ry) * 2, 6, slot.z + Math.cos(slot.ry) * 2);
    spot.target.position.set(slot.x, slot.y, slot.z);
    root.add(spot);
    root.add(spot.target);
    if (i === cursedIndex) {
      world.__cursedPainting = { mesh, meta: p };
    }
  });
  world.__galleryPaintings = paintingMeshes;
  world.__galleryViewed = new Set();

  // Entrance arch + portal beam — visible from the casino
  const arch = buildEntranceArch();
  arch.position.set(0, 0, 8);
  root.add(arch);

  // Portal trigger (invisible, checked in loop)
  world.__galleryPortal = new THREE.Vector3(38, 1.6, -4);

  return root;
}

function buildEntranceArch() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a1a24, roughness: 0.5, metalness: 0.6,
    emissive: 0x1a0a24, emissiveIntensity: 0.4,
  });
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.8), mat);
  s1.position.set(-1.5, 3, 0); group.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.8), mat);
  s2.position.set(1.5, 3, 0); group.add(s2);
  const top = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 12, 32, Math.PI), mat);
  top.position.set(0, 6, 0); top.rotation.z = Math.PI;
  group.add(top);
  const beam = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 5.6),
    new THREE.MeshBasicMaterial({
      color: 0xffd88a, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  beam.position.set(0, 2.8, 0);
  group.add(beam);
  return group;
}

function buildPainting(meta, slot) {
  const group = new THREE.Group();
  group.position.set(slot.x, slot.y, slot.z);
  group.rotation.y = slot.ry;

  // Gilded frame
  const frameThickness = 0.18;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xb59248, roughness: 0.35, metalness: 0.85,
    emissive: 0x3a2a0a, emissiveIntensity: 0.25,
  });
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(slot.w + 0.4, slot.h + 0.4, frameThickness),
    frameMat
  );
  frame.castShadow = true;
  group.add(frame);

  // Canvas (placeholder — a painterly gradient until the real texture loads)
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a14, roughness: 0.88, metalness: 0.05,
    map: buildPlaceholderPainting(meta),
  });
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(slot.w, slot.h),
    canvasMat
  );
  paint.position.z = frameThickness / 2 + 0.001;
  group.add(paint);

  // Lazy-load the real Wikimedia image — no-op on error.
  if (meta.url) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(meta.url,
      (tex) => {
        canvasMat.map = tex;
        canvasMat.color.setHex(0xffffff);
        canvasMat.needsUpdate = true;
      },
      undefined,
      () => { /* keep placeholder */ }
    );
  }

  // Small plinth plaque
  const plaqueMat = new THREE.MeshStandardMaterial({
    color: 0x14100a, roughness: 0.8, metalness: 0.4,
    emissive: 0x060402, emissiveIntensity: 0.1,
  });
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.08, 0.08),
    plaqueMat
  );
  plaque.position.set(0, -slot.h / 2 - 0.3, 0.05);
  group.add(plaque);

  group.userData = { paintingId: meta.id };
  return group;
}

function buildPlaceholderPainting(meta) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const ctx = c.getContext('2d');
  // Painterly gradient + letterform
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, meta.tint || '#3a1a14');
  g.addColorStop(0.5, '#0a0610');
  g.addColorStop(1, '#140a08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 320);
  // Noise
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(255,220,180,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 320, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.fillStyle = 'rgba(232,212,160,0.85)';
  ctx.font = 'italic 16px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  const title = (meta.title || '').toUpperCase();
  ctx.fillText(title.slice(0, 24), 128, 160);
  ctx.font = '12px "Cinzel", serif';
  ctx.fillStyle = 'rgba(200,180,140,0.7)';
  ctx.fillText(meta.artist || '', 128, 182);
  return new THREE.CanvasTexture(c);
}

function getPaintingManifest() {
  return [
    {
      id: 'isle-of-dead', title: 'Isle of the Dead',
      artist: 'Arnold Böcklin', year: 1883,
      line: 'A boat, a shrouded passenger, the island always waiting.',
      tint: '#1a2a38',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg/800px-Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg',
    },
    {
      id: 'wanderer', title: 'Wanderer above the Sea of Fog',
      artist: 'Caspar David Friedrich', year: 1818,
      line: 'He cannot see the cliff beneath his feet.',
      tint: '#2a2a2a',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Caspar_David_Friedrich_-_Wanderer_above_the_Sea_of_Fog.jpeg/800px-Caspar_David_Friedrich_-_Wanderer_above_the_Sea_of_Fog.jpeg',
    },
    {
      id: 'ulysses', title: 'Ulysses and the Sirens',
      artist: 'John William Waterhouse', year: 1891,
      line: 'They sing and he has asked to be tied.',
      tint: '#3a2818',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg/800px-John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg',
    },
    {
      id: 'magic-circle', title: 'The Magic Circle',
      artist: 'John William Waterhouse', year: 1886,
      line: 'She draws the circle. Do not step inside.',
      tint: '#2e1a18', cursed: true,
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/John_William_Waterhouse_-_Magic_Circle.JPG/600px-John_William_Waterhouse_-_Magic_Circle.JPG',
    },
    {
      id: 'danae', title: 'Danaë',
      artist: 'Gustav Klimt', year: 1907,
      line: 'Gold falls; she receives it sleeping.',
      tint: '#4a2a1a',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg/600px-KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg',
    },
    {
      id: 'birth-venus', title: 'The Birth of Venus',
      artist: 'William-Adolphe Bouguereau', year: 1879,
      line: 'She was never asked to want any of this.',
      tint: '#2a3a4a',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/William-Adolphe_Bouguereau_%281825-1905%29_-_The_Birth_of_Venus_%281879%29.jpg/600px-William-Adolphe_Bouguereau_%281825-1905%29_-_The_Birth_of_Venus_%281879%29.jpg',
    },
    {
      id: 'oedipus', title: 'Oedipus and the Sphinx',
      artist: 'Gustave Moreau', year: 1864,
      line: 'The riddle was you. You answered late.',
      tint: '#2a2018',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Gustave_Moreau_005.jpg/600px-Gustave_Moreau_005.jpg',
    },
    {
      id: 'cyclops', title: 'The Cyclops',
      artist: 'Odilon Redon', year: 1914,
      line: 'He watches her sleep, and does not know what else to do.',
      tint: '#1a2838',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Odilon_Redon_-_The_Cyclops.jpg/600px-Odilon_Redon_-_The_Cyclops.jpg',
    },
    {
      id: 'great-wave', title: 'The Great Wave off Kanagawa',
      artist: 'Katsushika Hokusai', year: 1831,
      line: 'The wave is older than any of the boats under it.',
      tint: '#182a3a',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/800px-Tsunami_by_hokusai_19th_century.jpg',
    },
    {
      id: 'proserpine', title: 'Proserpine',
      artist: 'Dante Gabriel Rossetti', year: 1874,
      line: 'Six seeds. Six months. A bargain she does not remember making.',
      tint: '#3a1a28',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Proserpine-1874.jpg/600px-Proserpine-1874.jpg',
    },
  ];
}

/* ============================================================
   LOOP HOOK — piggyback on existing requestAnimationFrame
   ============================================================ */
function installLoopHook(world) {
  // We wrap the existing loop so we advance uniforms each frame without
  // touching the internal loop() method.
  const originalLoop = world.loop.bind(world);
  world.loop = function() {
    tickWave1(world);
    originalLoop();
  };
}

function tickWave1(world) {
  const t = performance.now() * 0.001;
  if (world.__causticUTime) world.__causticUTime.value = t;
  if (world.__bubbleMat) world.__bubbleMat.uniforms.uTime.value = t;
  if (world.__sedimentMat) world.__sedimentMat.uniforms.uTime.value = t;

  // Table lamp flicker
  if (world.__tableLamps) {
    for (const l of world.__tableLamps) {
      const phase = l.__basePhase || 0;
      l.intensity = 0.7 + 0.25 * Math.sin(t * 1.9 + phase) + 0.1 * Math.sin(t * 7 + phase * 3);
    }
  }

  // Vignette uniform binding
  if (world.__vignette) {
    const breath = (typeof window.__trappedBreath === 'number') ? window.__trappedBreath : 200;
    world.__vignette.uniforms.uBreath.value = breath;
    world.__vignette.uniforms.uTime.value = t;
  }

  // Bokeh focus → nearest interactable
  if (world.__bokeh && world.camera) {
    const tgt = findFocusDistance(world);
    // Smooth
    const cur = world.__bokeh.uniforms.focus.value || 6.0;
    world.__bokeh.uniforms.focus.value = cur + (tgt - cur) * 0.08;
  }

  // Mermaid idle
  tickMermaidIdle(world, t);

  // Audio feedback (heartbeat + fragment hum)
  tickAudioFeedback(world);

  // Gallery plinth proximity + first-view bonus
  tickGalleryProximity(world);
}

function findFocusDistance(world) {
  const cam = world.camera;
  // Look at interactables (tables + fragments) and pick the nearest within
  // 20 units in front. Fallback to 6.
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const camP = cam.position;
  let best = 6.0;
  let bestScore = Infinity;
  const candidates = [];
  if (Array.isArray(world.interactables)) candidates.push(...world.interactables);
  if (Array.isArray(world.fragmentMeshes)) candidates.push(...world.fragmentMeshes);
  for (const obj of candidates) {
    if (!obj || !obj.position) continue;
    const toObj = obj.position.clone().sub(camP);
    const dot = toObj.clone().normalize().dot(dir);
    if (dot < 0.4) continue; // behind or off-angle
    const d = toObj.length();
    if (d > 20) continue;
    const score = d - dot * 2;
    if (score < bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function tickGalleryProximity(world) {
  if (!world.__galleryPaintings || !world.camera) return;
  const cam = world.camera.position;
  for (const p of world.__galleryPaintings) {
    const pos = new THREE.Vector3();
    p.mesh.getWorldPosition(pos);
    const d = pos.distanceTo(cam);
    if (d < 3.2 && !world.__galleryViewed.has(p.meta.id)) {
      world.__galleryViewed.add(p.meta.id);
      world.emit && world.emit('gallery-view', p.meta);
      if (window.__trappedAudio && window.__trappedAudio.playFragmentPickup) {
        // gentle chime, reuse existing sfx
        window.__trappedAudio.playFragmentPickup();
      }
      // Cursed piece — dwell check
      if (p.meta.cursed) {
        if (!world.__cursedDwellStart) world.__cursedDwellStart = performance.now();
      }
    }
    if (p.meta.cursed && d < 3.2) {
      if (!world.__cursedDwellStart) world.__cursedDwellStart = performance.now();
      const dwell = (performance.now() - world.__cursedDwellStart) / 1000;
      if (dwell > 3 && !world.__cursedTriggered) {
        world.__cursedTriggered = true;
        if (window.__trappedAudio && window.__trappedAudio.playBellToll) {
          window.__trappedAudio.playBellToll();
        }
        world.emit && world.emit('gallery-cursed', p.meta);
      }
    }
  }
}
