import * as THREE from 'three';
import gl from './renderer.js';
import { trackProgress, range, easeInOut } from './util.js';
import { PRODUCTS } from '../brand.js';

/**
 * The range act — a morphing 3D spice sphere.
 *
 * Replaces the static box with a dynamic, organic spice sphere. As the user
 * scrolls through the range, the sphere smoothly transitions its core accent
 * color to match each product while undulating in 3D space.
 */

// Which product sits on which stage, in the order presented.
const FACE_ORDER = [0, 1, 2, 3, 4, 5];

const SPHERE_FRAG = /* glsl */ `
  uniform vec3  uAccent;
  uniform float uReveal;
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vN;

  void main() {
    // Base surface color built from product accent
    vec3 col = uAccent * 0.45;

    // Surface brightness follows camera alignment
    float facing = clamp(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    float lit = 0.30 + pow(facing, 1.4) * 0.95;
    col *= lit;

    // Warm key lighting from upper left
    float key = 0.86 + 0.24 * clamp(dot(normalize(vN), normalize(vec3(-0.5, 0.7, 0.6))), 0.0, 1.0);
    col *= key;

    // Dynamic accent glow along contours
    float edge = pow(1.0 - facing, 2.0);
    col += uAccent * edge * 1.2;

    // Slow organic sheen travelling across the surface
    float sheen = smoothstep(0.5, 0.0, abs(vUv.x + vUv.y - 1.0 + sin(uTime * 0.4) * 0.8));
    col += vec3(1.0, 0.85, 0.6) * sheen * facing * 0.25;

    gl_FragColor = vec4(col, uReveal);
  }
`;

const SPHERE_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;

  void main() {
    vUv = uv;
    
    // Add organic 3D wave displacement over vertices
    vec3 p = position;
    float wave = sin(p.x * 2.0 + uTime * 1.5) * cos(p.y * 2.0 + uTime * 1.2) * sin(p.z * 2.0 + uTime * 1.0);
    p += normal * wave * 0.22;

    vN = normalize(mat3(modelViewMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export class Cube {
  constructor(el, track) {
    this.el = el;
    this.track = track || el;
    this.onProduct = null;
    this._current = -1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0, 12.5);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.currentColor = new THREE.Color(PRODUCTS[0] ? PRODUCTS[0].accent : '#ff9900');
    this.targetColor = new THREE.Color(PRODUCTS[0] ? PRODUCTS[0].accent : '#ff9900');

    this._build();
    this._buildMotes();
  }

  _build() {
    const RADIUS = 2.6;

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uAccent: { value: this.currentColor },
        uReveal: { value: 1.0 },
        uTime: { value: 0 },
      },
      vertexShader: SPHERE_VERT,
      fragmentShader: SPHERE_FRAG,
    });

    // Replaces BoxGeometry with an Icosahedron (Sphere)
    const geometry = new THREE.IcosahedronGeometry(RADIUS, 32);
    this.sphereMesh = new THREE.Mesh(geometry, this.mat);
    this.rig.add(this.sphereMesh);

    // Soft glow pool underneath
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(RADIUS * 2.2, 48),
      new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -RADIUS * 1.3;
    this.glow = glow;
    this.scene.add(glow);
  }

  _buildMotes() {
    const COUNT = (gl && gl.reduced) ? 110 : 600;
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const dpr = (gl && gl.dpr) ? gl.dpr : 1.0;
    this.moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 2.0 * dpr }, uFade: { value: 1.0 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uSize, uFade;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.3 + aSeed * 27.0) * 0.8;
          p.x += cos(uTime * 0.25 + aSeed * 20.0) * 0.8;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (0.18 + aSeed * 0.42) * uFade;
          gl_PointSize = uSize * (1.0 / -mv.z) * 26.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = dot(uv, uv);
          if (d > 0.25) discard;
          gl_FragColor = vec4(1.0, 0.72, 0.42, smoothstep(0.25, 0.0, d) * vA);
        }`,
    });
    const pts = new THREE.Points(geo, this.moteMat);
    pts.frustumCulled = false;
    this.scene.add(pts);
  }

  update(dt, t) {
    const p = trackProgress ? trackProgress(this.track) : 0;
    const n = FACE_ORDER.length;
    
    // Smooth reveal calculation based on scroll track
    const baseReveal = range(p, 0.01, 0.10) * (1 - range(p, 0.95, 1.0));
    const reveal = Math.max(0.85, baseReveal); // Ensures constant visibility baseline

    const scaled = THREE.MathUtils.clamp(p, 0, 0.9999) * n;
    const idx = Math.floor(scaled);

    // Transition sphere color to the active spice accent
    if (PRODUCTS && PRODUCTS[idx]) {
      this.targetColor.set(PRODUCTS[idx].accent);
    }
    this.currentColor.lerp(this.targetColor, 0.08);

    // Continuous 3D rotation and floating animation
    const pointerY = (gl && gl.pointer) ? gl.pointer.y : 0;
    const pointerX = (gl && gl.pointer) ? gl.pointer.x : 0;

    this.rig.rotation.y = t * 0.25 + p * Math.PI * 2;
    this.rig.rotation.x = 0.20 + Math.sin(t * 0.4) * 0.10 + pointerY * 0.10;
    this.rig.rotation.z = Math.sin(p * Math.PI * 2) * 0.08;
    this.rig.position.y = Math.sin(t * 0.7) * 0.12;

    // Update shader uniforms
    this.mat.uniforms.uReveal.value = reveal;
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uAccent.value = this.currentColor;

    this.glow.material.opacity = 0.12 * reveal;
    this.moteMat.uniforms.uTime.value = t;
    this.moteMat.uniforms.uFade.value = reveal;

    this.camera.position.x = pointerX * 0.8;
    this.camera.position.z = THREE.MathUtils.lerp(13.5, 11.0, p);
    this.camera.lookAt(0, 0, 0);

    const shown = Math.min(n - 1, idx);
    if (shown !== this._current) {
      this._current = shown;
      if (this.onProduct && PRODUCTS[shown]) {
        this.onProduct(shown, PRODUCTS[shown]);
      }
    }
  }
}

export function createCube(el, track) {
  return gl.add(new Cube(el, track));
}