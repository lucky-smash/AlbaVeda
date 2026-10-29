import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { makeChunk, makeClayMaterial } from "./ClayCrush";
import { clamp01, easeOutCubic, fbm, mulberry32 } from "./util";

/**
 * Hero — a heap of real Multani Mitti resting on the soil beside the pack: a layered slab,
 * broken chunks, crumbs and a powder pile spilling onto the ground, textured from the
 * reference photograph. Rises out of the soil once the pack has formed.
 */
export class ClayHeap {
  readonly group = new THREE.Group();
  private body = new THREE.Group(); // everything that rises out of the soil
  private pile: THREE.Mesh;
  private spill: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private shade: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  constructor(tier: "full" | "lite", x: number, z: number, groundY: number) {
    const full = tier === "full";
    const rnd = mulberry32(97);
    const loader = new THREE.TextureLoader();
    const clayTex = loadTex(loader, "/img/clay/multani-clay.webp", full);
    const powderTex = loadTex(loader, "/img/clay/multani-powder.webp", full);

    const rockMat = makeClayMaterial(clayTex, false, full ? 2.4 : 1.6);
    const crumbMat = makeClayMaterial(clayTex, true, full ? 1.4 : 1);
    const powderMat = makeClayMaterial(powderTex, false, full ? 2.2 : 1.5, 0.9);

    this.group.position.set(x, groundY, z);
    this.group.rotation.y = -0.4;
    this.group.scale.setScalar(1.2);
    this.group.add(this.body);

    // The big leaning slab and two broken chunks, arranged like the photograph
    const pieces: { geo: THREE.BufferGeometry; pos: [number, number, number]; rot: [number, number, number]; s: [number, number, number] }[] = [
      { geo: makeChunk(full ? 4 : 3, 21, 5, 0.46, 0.7, true), pos: [0.07, 0.075, -0.05], rot: [0.08, 0.4, 0.32], s: [0.19, 0.17, 0.15] },
      { geo: makeChunk(3, 33, 5, 0.42, 0.66, false), pos: [-0.15, 0.05, 0.02], rot: [0.5, 1.1, -0.25], s: [0.085, 0.075, 0.08] },
      { geo: makeChunk(3, 47, 4, 0.45, 0.68, false), pos: [-0.07, 0.045, -0.15], rot: [1.2, 0.3, 0.6], s: [0.07, 0.06, 0.065] },
    ];
    for (const p of pieces) {
      const m = new THREE.Mesh(p.geo, rockMat);
      m.position.set(...p.pos);
      m.rotation.set(...p.rot);
      m.scale.set(...p.s);
      m.castShadow = full;
      m.receiveShadow = full;
      this.body.add(m);
    }

    // Crumbs scattered around the base
    const crumbCount = full ? 16 : 9;
    const crumbs = new THREE.InstancedMesh(makeChunk(1, 59, 5, 0.42, 0.62, false), crumbMat, crumbCount);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < crumbCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.13 + rnd() * 0.2;
      const size = 0.01 + rnd() * rnd() * 0.028;
      v.set(Math.cos(a) * r, size * 0.35, Math.sin(a) * r * 0.8 + 0.04);
      q.setFromEuler(e.set(rnd() * 6, rnd() * 6, rnd() * 6));
      s.set(size, size * 0.8, size);
      crumbs.setMatrixAt(i, mtx.compose(v, q, s));
      crumbs.setColorAt(i, col.setScalar(0.9 + rnd() * 0.12));
    }
    crumbs.castShadow = full;
    this.body.add(crumbs);

    // Powder pile in front of the slab
    this.pile = new THREE.Mesh(makePile(full ? 40 : 28), powderMat);
    this.pile.position.set(-0.03, 0, 0.1);
    this.pile.scale.set(0.15, 0.15, 0.13);
    this.pile.castShadow = full;
    this.pile.receiveShadow = full;
    this.body.add(this.pile);

    // Fine powder spilt over the soil, and a soft occlusion under the heap (all tiers)
    const spillAlpha = makeSpillAlpha(full ? 256 : 128);
    const spillMap = powderTex.clone();
    spillMap.repeat.set(3, 3);
    this.spill = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ map: spillMap, alphaMap: spillAlpha, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, opacity: 0 }),
    );
    this.spill.rotation.x = -Math.PI / 2;
    this.spill.position.set(-0.02, 0.006, 0.06);
    this.spill.scale.set(0.72, 0.56, 1);
    this.spill.receiveShadow = full;
    this.spill.renderOrder = 1;
    this.group.add(this.spill);

    this.shade = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: "#050302", alphaMap: spillAlpha, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, opacity: 0 }),
    );
    this.shade.rotation.x = -Math.PI / 2;
    this.shade.position.set(0.02, 0.004, -0.02);
    this.shade.scale.set(0.62, 0.48, 1);
    this.shade.renderOrder = 1;
    this.group.add(this.shade);

    this.group.visible = false;
  }

  /** @param show 0→1 rise out of the soil (0 = fully sunk and hidden) */
  update(show: number) {
    this.group.visible = show > 0.001;
    if (!this.group.visible) return;
    const rise = easeOutCubic(clamp01(show * 1.25));
    const settle = easeOutCubic(clamp01(show * 1.6 - 0.45));
    this.body.position.y = -(1 - rise) * 0.32; // the soil hides whatever is still below it
    this.pile.scale.y = 0.15 * Math.max(settle, 0.001);
    this.spill.material.opacity = settle * 0.92;
    this.shade.material.opacity = rise * 0.55;
  }
}

function loadTex(loader: THREE.TextureLoader, url: string, full: boolean) {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.anisotropy = full ? 4 : 1;
  return tex;
}

/** A conical heap of powder, slumped and grainy, with its rim sunk just below the soil. */
function makePile(seg: number) {
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const rr = Math.acos(clamp01(d.y)) / (Math.PI / 2); // 0 summit → 1 rim, evenly spaced
    const h = Math.hypot(d.x, d.z) || 1;
    const lump = fbm(d.x * 3.1 + 4, d.z * 3.1 - 2, 3) - 0.5;
    const r = rr * (1 + lump * 0.22);
    const y = 0.78 * Math.pow(1 - rr, 1.35) * (1 + lump * 0.35) - 0.03;
    pos.setXYZ(i, (d.x / h) * r, y, (d.z / h) * r);
    const shade = 0.86 + (1 - rr) * 0.14;
    colors.set([shade, shade, shade * 0.98], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Soft, grainy-edged alpha for powder dusted over the soil. */
function makeSpillAlpha(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // stray grains past the soft edge
  const rnd = mulberry32(31);
  for (let i = 0; i < size * 3; i++) {
    const a = rnd() * Math.PI * 2;
    const r = (0.25 + rnd() * 0.28) * size;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
    ctx.fillRect(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
