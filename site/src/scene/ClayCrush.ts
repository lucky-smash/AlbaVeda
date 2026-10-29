import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp01, easeInOutCubic, easeOutCubic, fbm, lerp, mulberry32, range, smooth } from "./util";

/**
 * Chapter 3 — Multani Mitti.
 *
 * Lumps of fuller's earth rise out of the bare soil, tremble, crack into
 * shards, and the crumbs stream as clay dust into the real Multani Mitti pack.
 *
 * Driven by two scroll values so it is fully reversible:
 *   approach  0→1  while scrolling into the chapter (lumps rise and hang in the air)
 *   hold      0→1  while the chapter copy is pinned (tremble → crush → dust into pack)
 */

// Powder tones sampled from the Multani Mitti reference photo
const CLAY = ["#c59f64", "#d6b47e", "#e4c799", "#cfab72"];

interface Rock {
  air: THREE.Vector3;
  ground: THREE.Vector3;
  radius: number;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  delay: number;
}

interface Shard {
  rock: number;
  offset: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  scale: number;
  axis: THREE.Vector3;
  spin: number;
}

export class ClayCrush {
  readonly group = new THREE.Group();
  private rocks: Rock[] = [];
  private shards: Shard[] = [];
  private rockMesh: THREE.InstancedMesh;
  private shardMesh: THREE.InstancedMesh;
  private dust: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(tier: "full" | "lite", soilHeight: (x: number, z: number) => number, pixelRatio: number) {
    const full = tier === "full";
    const rnd = mulberry32(211);

    // Lumps hang around and above the pack, clear of the label's centre.
    const spots: [number, number, number, number][] = [
      [-0.9, 1.18, 0.28, 0.14],
      [0.84, 1.3, 0.12, 0.13],
      [-0.52, 1.52, -0.3, 0.11],
      [1.1, 0.86, -0.22, 0.12],
      [0.32, 1.58, 0.24, 0.1],
      [-1.16, 0.74, -0.1, 0.12],
      [0.7, 0.46, 0.5, 0.09],
    ];
    const used = full ? spots : spots.slice(0, 5);
    used.forEach(([x, y, z, r], i) => {
      const gx = x * 1.15;
      const gz = z * 0.8 + 0.25;
      this.rocks.push({
        air: new THREE.Vector3(x, y, z),
        ground: new THREE.Vector3(gx, soilHeight(gx, gz) - r * 0.6, gz),
        radius: r,
        rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6),
        spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.9),
        delay: i * 0.035,
      });
    });

    // Surface photographed from real Multani Mitti, lighting flattened so the scene lights it
    const photo = new THREE.TextureLoader().load("/img/clay/multani-clay.webp");
    photo.colorSpace = THREE.SRGBColorSpace;
    photo.wrapS = photo.wrapT = THREE.MirroredRepeatWrapping;
    photo.anisotropy = full ? 4 : 1;
    const rockMat = makeClayMaterial(photo, false, full ? 2.4 : 1.6);
    const shardMat = makeClayMaterial(photo, true, full ? 1.8 : 1.2);

    // Lumps: layered slabs of fuller's earth with broken, flat fracture faces
    const rockGeo = makeChunk(full ? 4 : 3, 7, 5, 0.46, 0.7, true);
    this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, this.rocks.length);
    this.rockMesh.castShadow = full;
    this.rockMesh.receiveShadow = full;
    this.rockMesh.frustumCulled = false;
    const col = new THREE.Color();
    // near-white tints: the photo carries the colour, these only vary each lump's tone a touch
    this.rocks.forEach((_, i) => this.rockMesh.setColorAt(i, col.setScalar(0.92 + ((i * 0.37) % 1) * 0.12)));
    this.group.add(this.rockMesh);

    // Shards: small broken pieces packed inside each lump's volume
    const perRock = full ? 16 : 10;
    const shardGeo = makeChunk(1, 13, 5, 0.42, 0.62, false);
    this.rocks.forEach((_, ri) => {
      for (let j = 0; j < perRock; j++) {
        const offset = randomInSphere(rnd).multiplyScalar(0.55);
        const dir = offset.clone().normalize().add(randomInSphere(rnd).multiplyScalar(0.45)).normalize();
        this.shards.push({
          rock: ri,
          offset,
          dir,
          speed: 0.35 + rnd() * 0.55,
          scale: 0.26 + rnd() * 0.22,
          axis: randomInSphere(rnd).normalize(),
          spin: 2 + rnd() * 5,
        });
      }
    });
    this.shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, this.shards.length);
    this.shardMesh.castShadow = full;
    this.shardMesh.frustumCulled = false;
    this.shards.forEach((_, i) => this.shardMesh.setColorAt(i, col.setScalar(0.9 + ((i * 0.53) % 1) * 0.14)));
    this.group.add(this.shardMesh);

    this.dust = makeDust(this.rocks, full ? 2400 : 900, rnd, pixelRatio);
    this.group.add(this.dust);
  }

  /**
   * @param approach 0→1 lumps rise from the soil into the air
   * @param hold     0→1 tremble, crush, stream into the pack
   * @returns how strongly the pack is absorbing dust right now (0..1), for a subtle pulse
   */
  update(approach: number, hold: number, time: number, packMatrix: THREE.Matrix4) {
    const visible = approach > 0.001;
    this.group.visible = visible;
    if (!visible) return 0;

    const crack = 0.24; // hold value where lumps break
    const shake = range(hold, 0.06, crack);

    // Lumps ----------------------------------------------------------------
    this.rocks.forEach((r, i) => {
      const up = easeOutCubic(clamp01((approach - r.delay) / (1 - r.delay)));
      const intact = hold < crack;
      this.p.lerpVectors(r.ground, r.air, up);
      this.p.y += Math.sin(time * 0.8 + i * 1.7) * 0.03 * up; // weightless bob once airborne
      if (shake > 0) {
        const a = shake * shake * 0.012;
        this.p.x += Math.sin(time * 61 + i * 7.1) * a;
        this.p.y += Math.sin(time * 53 + i * 3.3) * a;
      }
      this.e.set(r.rot.x + r.spin.x * time * 0.4, r.rot.y + r.spin.y * time * 0.4, r.rot.z + r.spin.z * time * 0.4);
      this.q.setFromEuler(this.e);
      const size = intact ? r.radius * lerp(0.55, 1, up) * (1 + shake * 0.04) : 0.0001;
      this.s.set(size, size * 0.86, size * 0.95);
      this.m.compose(this.p, this.q, this.s);
      this.rockMesh.setMatrixAt(i, this.m);
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;

    // Shards ---------------------------------------------------------------
    const burst = range(hold, crack, 0.62);
    const crumble = smooth(range(hold, 0.32, 0.66));
    this.shardMesh.visible = hold >= crack && crumble < 1;
    if (this.shardMesh.visible) {
      this.shards.forEach((sh, i) => {
        const r = this.rocks[sh.rock];
        const t = easeOutCubic(burst);
        this.p.copy(r.air).addScaledVector(sh.offset, r.radius);
        this.p.addScaledVector(sh.dir, t * sh.speed * 0.45);
        this.p.y -= burst * burst * 0.22; // gravity tugs the bigger crumbs
        this.q.setFromAxisAngle(sh.axis, sh.spin * burst);
        const size = r.radius * sh.scale * (1 - crumble);
        this.s.setScalar(Math.max(size, 0.0001));
        this.m.compose(this.p, this.q, this.s);
        this.shardMesh.setMatrixAt(i, this.m);
      });
      this.shardMesh.instanceMatrix.needsUpdate = true;
    }

    // Dust stream into the pack -------------------------------------------
    const u = this.dust.material.uniforms;
    u.uProgress.value = easeInOutCubic(range(hold, crack - 0.02, 0.97));
    u.uTime.value = time;
    u.uPackMatrix.value.copy(packMatrix);
    this.dust.visible = hold > crack - 0.02;

    return Math.sin(Math.PI * range(hold, 0.45, 1.0));
  }
}

/* --------------------------------------------------------------- helpers */

function randomInSphere(rnd: () => number) {
  const v = new THREE.Vector3();
  do v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
  while (v.lengthSq() > 1);
  return v;
}

/**
 * A chunk of fuller's earth: boxy, layered along its height like the slab in the reference
 * photo, with a few flat fracture faces where it broke off the bed.
 */
export function makeChunk(detail: number, seed: number, cuts: number, dMin: number, dMax: number, slab: boolean) {
  const rnd = mulberry32(seed);
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo); // shared vertices so lumps shade smoothly between the fractures

  const planes = Array.from({ length: cuts }, () => ({ n: randomInSphere(rnd).normalize(), d: lerp(dMin, dMax, rnd()) }));
  planes[0].n.set(rnd() * 0.3 - 0.15, -1, rnd() * 0.3 - 0.15).normalize(); // a flat base to rest on
  if (slab) planes[0].d = 0.4;

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const dir = new THREE.Vector3();
  const p = new THREE.Vector3();
  const boxy = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 0.7);
  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    p.set(boxy(dir.x), boxy(dir.y), boxy(dir.z));
    if (slab) p.multiply(new THREE.Vector3(1.3, 0.72, 1));
    const n = fbm(dir.x * 1.9 + seed, dir.y * 1.9 + dir.z * 1.4 - seed, 3);
    p.multiplyScalar(1 + (n - 0.5) * 0.32);
    if (slab) {
      // sedimentary layers: ledges stepping in and out around the sides
      const ledge = 1 + Math.sin(p.y * 30 + n * 5) * 0.035 * (1 - Math.abs(dir.y));
      p.x *= ledge;
      p.z *= ledge;
    }
    let broken = false;
    for (const pl of planes) {
      const over = p.dot(pl.n) - pl.d;
      if (over > 0) {
        p.addScaledVector(pl.n, -over);
        p.addScaledVector(pl.n, (fbm(p.x * 6 + seed, p.z * 6 + p.y * 4, 2) - 0.5) * 0.04);
        broken = true;
      }
    }
    pos.setXYZ(i, p.x, p.y, p.z);
    // crevices a touch darker; fresh fracture faces a touch paler, as in the photo
    const shade = (0.84 + n * 0.22) * (broken ? 1.05 : 1);
    colors.set([shade, shade, shade * 0.98], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Standard clay material textured with the photo by triplanar projection (the lumps have no
 * UVs), with relief derived from the photo's own light and dark so cracks and layers read in 3D.
 */
export function makeClayMaterial(photo: THREE.Texture, faceted: boolean, bump: number, texScale = 0.34) {
  const mat = new THREE.MeshStandardMaterial({ map: photo, vertexColors: true, roughness: 0.96, metalness: 0, flatShading: faceted });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uClayBump = { value: bump };
    shader.uniforms.uTexScale = { value: texScale };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTexScale;\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        // each lump samples its own patch of the photo
        vTriPos = position * uTexScale + fract(vec3(0.618, 0.381, 0.755) * (float(gl_InstanceID) + 1.0) * 3.7);
        vTriNrm = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        /* glsl */ `#include <map_pars_fragment>
        varying vec3 vTriPos;
        varying vec3 vTriNrm;
        uniform float uClayBump;
        vec3 clayTri(vec3 p, vec3 w) {
          return texture2D(map, p.zy).rgb * w.x + texture2D(map, p.xz).rgb * w.y + texture2D(map, p.xy).rgb * w.z;
        }
        vec3 clayPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
          vec3 sx = normalize(dFdx(surfPos));
          vec3 sy = normalize(dFdy(surfPos));
          vec3 r1 = cross(sy, surfNorm);
          vec3 r2 = cross(surfNorm, sx);
          float det = dot(sx, r1) * faceDir;
          vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
          return normalize(abs(det) * surfNorm - grad);
        }`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `vec3 triW = pow(abs(normalize(vTriNrm)), vec3(4.0));
        triW /= triW.x + triW.y + triW.z;
        vec3 clayTex = clayTri(vTriPos, triW);
        diffuseColor.rgb *= clayTex;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        {
          float h0 = dot(clayTex, vec3(0.333));
          float hx = dot(clayTri(vTriPos + dFdx(vTriPos), triW), vec3(0.333)) - h0;
          float hy = dot(clayTri(vTriPos + dFdy(vTriPos), triW), vec3(0.333)) - h0;
          normal = clayPerturb(-vViewPosition, normal, vec2(hx, hy) * uClayBump, faceDirection);
        }`,
      );
  };
  mat.customProgramCacheKey = () => "multani-clay";
  return mat;
}

const PACK_W = 1.25 * 0.627;
const PACK_H = 1.25;
const PACK_D = 0.09;

function makeDust(rocks: Rock[], count: number, rnd: () => number, pixelRatio: number) {
  const start = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const rand = new Float32Array(count * 4);
  const color = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = rocks[i % rocks.length];
    const p = randomInSphere(rnd).multiplyScalar(r.radius * 0.85).add(r.air);
    start.set([p.x, p.y, p.z], i * 3);
    // Pour mostly into the top and front of the carton
    const top = rnd() < 0.35;
    if (top) target.set([(rnd() - 0.5) * PACK_W * 0.9, PACK_H / 2, (rnd() - 0.5) * PACK_D], i * 3);
    else target.set([(rnd() - 0.5) * PACK_W, (rnd() - 0.2) * PACK_H * 0.75, PACK_D / 2 + 0.004], i * 3);
    rand.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    c.set(CLAY[Math.floor(rnd() * CLAY.length)]);
    color.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(start, 3));
  geo.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPackMatrix: { value: new THREE.Matrix4() },
      uSize: { value: 20 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aTarget;
      attribute vec4 aRand;
      attribute vec3 aColor;
      uniform float uProgress, uTime, uSize, uPixelRatio;
      uniform mat4 uPackMatrix;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 target = (uPackMatrix * vec4(aTarget, 1.0)).xyz;
        float delay = aRand.x * 0.42;
        float m = clamp((uProgress - delay) / 0.55, 0.0, 1.0);
        float e = m * m * (3.0 - 2.0 * m);
        // puff outward from the crushed lump, then funnel over and into the pack
        vec3 puff = normalize(vec3(aRand.y - 0.5, aRand.z - 0.25, aRand.w - 0.5) + 1e-4) * (0.18 + aRand.w * 0.32);
        vec3 above = vec3(target.x * 0.6, target.y + 0.55 + aRand.z * 0.3, target.z + 0.15);
        vec3 mid = mix(position + puff, above, 0.45);
        float im = 1.0 - e;
        vec3 p = im * im * position + 2.0 * im * e * mid + e * e * target;
        float air = 4.0 * e * im;
        p += vec3(sin(uTime * 1.9 + aRand.y * 40.0), cos(uTime * 1.5 + aRand.z * 30.0), sin(uTime * 1.2 + aRand.x * 20.0)) * 0.03 * air;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.35 + aRand.w * 0.85) * uPixelRatio / -mv.z;
        vColor = aColor;
        // appears as the lump breaks, vanishes as it settles into the pack
        vAlpha = smoothstep(0.0, 0.05, m) * (1.0 - smoothstep(0.82, 1.0, m)) * (0.55 + aRand.z * 0.45);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return points;
}
