import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  clamp01,
  damp,
  easeInOutCubic,
  easeOutCubic,
  easeOutQuint,
  fbm,
  lerp,
  mulberry32,
  range,
  smooth,
} from "./util";
import { ClayCrush } from "./ClayCrush";
import { ClayHeap } from "./ClayHeap";

/**
 * The AlbaVeda botanical stage.
 *
 * Story (time-driven intro, then scroll-driven chapters):
 *   soil → moringa sprouts grow → leaves release powder → powder converges and
 *   the real Moringa pack materialises → (scroll) chapters flip the pack to
 *   other real products while the scene changes around it:
 *     ch.1 Moringa  — leafy sprouts
 *     ch.2 Amla · Reetha · Shikakai — sprouts settle, fruiting amla trees grow
 *     ch.3 Multani Mitti — every plant recedes, the ground turns to sun-baked clay, clay dust
 *
 * All state is a pure function of (introT, story) so scrolling backwards,
 * skipping, or scrolling during the intro always resolves to a coherent frame.
 */

export interface StagePack {
  url: string;
  halo: string;
  tint: string;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  tier: "full" | "lite";
  packs: StagePack[];
  playIntro: boolean;
  onIntroDone?: () => void;
  onFirstFrame?: () => void;
  onFail?: () => void;
}

const PACK_H = 1.25;
const PACK_ASPECT = 0.627; // measured from the cropped carton photography
const PACK_W = PACK_H * PACK_ASPECT;
const PACK_D = 0.26; // ~1/3 of the width, like a real powder carton
const PACK_Y = PACK_H / 2 + 0.035;
export const INTRO_LEN = 5.2;

const SOIL_FOG = new THREE.Color("#18120d");
// Multani Mitti chapter: dark loam gives way to a dusty ochre clay pan under a warm haze
const CLAY_FOG = new THREE.Color("#5a391f");
const CLAY_SKY_HIGH = new THREE.Color("#6e4a30");

interface Sprout {
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  segments: number;
  radial: number;
  start: number;
  /** Leaflets and rachis segments, each revealed once the stem grows past `t`. */
  leaves: { mesh: THREE.InstancedMesh; index: number; t: number; matrix: THREE.Matrix4 }[];
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class BotanicalScene {
  private opts: SceneOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  private timer = new THREE.Timer();
  private raf = 0;
  private running = false;
  private disposed = false;
  private firstFrame = false;

  private introT = 0;
  private introSpeed = 1;
  private introDone = false;
  private storyTarget = 0;
  private story = 0;
  private pointerTarget = new THREE.Vector2();
  private pointer = new THREE.Vector2();
  private portrait = false;
  private width = 1;
  private height = 1;

  private sprouts: Sprout[] = [];
  private leafMesh!: THREE.InstancedMesh;
  private rachisMesh!: THREE.InstancedMesh;
  private clay!: ClayCrush;
  private heap!: ClayHeap;
  private amlaGroup = new THREE.Group();
  private amlaTrees: { obj: THREE.Object3D; s: number; yaw: number; shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; w: number }[] = [];
  private amlaGrowth = 0; // only ever rises: once the trees have grown they stay planted
  private vines: { pivot: THREE.Object3D; top: number; phase: number }[] = [];
  private foliageTime = { value: 0 };
  private earthMix = { value: 0 }; // 0 dark loam → 1 Multani clay ground
  private pack = new THREE.Group();
  private packMesh!: THREE.Mesh;
  private packFront!: THREE.MeshStandardMaterial;
  private packSides: THREE.MeshStandardMaterial[] = [];
  private textures: (THREE.Texture | null)[] = [];
  private sideColors: THREE.Color[] = [];
  private shownPack = -1;
  private revealUniforms = { uReveal: { value: 0 }, uEdge: { value: new THREE.Color("#9dbb5a") } };
  private contactShadow!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private halo!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private powder!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private dust!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private keyLight!: THREE.DirectionalLight;
  private haloColors: THREE.Color[];
  private tintColors: THREE.Color[];
  private tmpColor = new THREE.Color();
  private tmpM = new THREE.Matrix4();
  private tmpV = new THREE.Vector3();
  private tmpS = new THREE.Vector3();
  private tmpQ = new THREE.Quaternion();

  constructor(opts: SceneOptions) {
    this.opts = opts;
    const full = opts.tier === "full";
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: full,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, full ? 2 : 1.5));
    this.renderer.toneMapping = THREE.NeutralToneMapping; // keeps label hues honest
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(SOIL_FOG);
    if (full) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.haloColors = opts.packs.map((p) => new THREE.Color(p.halo));
    this.tintColors = opts.packs.map((p) => new THREE.Color(p.tint));

    this.scene.fog = new THREE.Fog(SOIL_FOG, 5.5, 15);
    this.buildSky();
    this.buildLights();
    this.buildSoil();
    this.buildSprouts();
    this.buildAmla();
    this.buildTreeline();
    this.buildVines();
    this.buildPack();
    this.buildPowder();
    this.buildDust();
    this.clay = new ClayCrush(opts.tier, (x, z) => this.soilHeight(x, z), this.renderer.getPixelRatio());
    this.scene.add(this.clay.group);
    // Hero: a heap of real Multani Mitti at the pack's front-right foot, clear of the sprouts
    this.heap = new ClayHeap(opts.tier, 0.56, 0.95, this.soilHeight(0.56, 0.95));
    this.scene.add(this.heap.group);

    if (!opts.playIntro) {
      this.introT = INTRO_LEN;
      this.introDone = true;
    }

    opts.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
  }

  /* ------------------------------------------------------------------ build */

  private buildSky() {
    const geo = new THREE.SphereGeometry(40, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uLight: { value: new THREE.Vector3(0.62, 0.22, -0.75).normalize() },
        uTint: { value: new THREE.Color("#9dbb6a") },
        uTintMix: { value: 0 },
        uEarthMix: this.earthMix,
        uClayLow: { value: CLAY_FOG },
        uClayHigh: { value: CLAY_SKY_HIGH },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLight;
        uniform vec3 uTint;
        uniform float uTintMix;
        uniform float uEarthMix;
        uniform vec3 uClayLow;
        uniform vec3 uClayHigh;
        varying vec3 vDir;
        void main() {
          // linear values; "low" equals the fog colour so the soil melts into the horizon
          vec3 low = mix(vec3(0.0091, 0.0062, 0.0040), uClayLow, uEarthMix);
          vec3 high = mix(vec3(0.022, 0.014, 0.009), uClayHigh, uEarthMix);
          float above = smoothstep(-0.02, 0.32, vDir.y);
          vec3 col = mix(low, high, above);
          float g = max(dot(vDir, uLight), 0.0);
          col += vec3(0.30, 0.15, 0.06) * pow(g, 4.0) * 0.55 * above;
          col += uTint * pow(g, 2.0) * 0.05 * uTintMix * above;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
  }

  private buildLights() {
    const full = this.opts.tier === "full";
    this.scene.add(new THREE.HemisphereLight("#ffe6c7", "#2a1c12", 1.05));

    const key = new THREE.DirectionalLight("#ffe0b8", 2.4);
    key.position.set(2.4, 3.4, 3.4);
    if (full) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -2.4;
      key.shadow.camera.right = 2.4;
      key.shadow.camera.top = 2.6;
      key.shadow.camera.bottom = -1.2;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 12;
      key.shadow.bias = -0.0008;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 4;
    }
    this.keyLight = key;
    this.scene.add(key);

    // Back rim light separates leaves and pack edges from the dark soil.
    const rim = new THREE.DirectionalLight("#d8ecc8", 1.5);
    rim.position.set(-2.6, 2.3, -3.2);
    this.scene.add(rim);

    // Soft frontal fill so the printed label always reads clearly.
    const fill = new THREE.DirectionalLight("#fff4e6", 0.75);
    fill.position.set(-0.4, 1.2, 5);
    this.scene.add(fill);
  }

  private soilHeight(x: number, z: number) {
    const r = Math.hypot(x, z);
    const bed = smooth(clamp01((r - 0.6) / 1.6)); // calm, flat bed under the pack
    return (fbm(x * 0.55 + 3.1, z * 0.55 - 1.7) - 0.5) * 0.42 * bed + (fbm(x * 3.2, z * 3.2) - 0.5) * 0.045 - 0.01;
  }

  private buildSoil() {
    const full = this.opts.tier === "full";
    const seg = full ? 200 : 110;
    const geo = new THREE.PlaneGeometry(44, 44, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const clayColors = new Float32Array(pos.count * 3);
    const dark = new THREE.Color("#22180f");
    const mid = new THREE.Color("#3a2919");
    const crest = new THREE.Color("#55402b");
    const clayDark = new THREE.Color("#8a6040");
    const clayMid = new THREE.Color("#b88a5c");
    const clayCrest = new THREE.Color("#dcb98a");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.soilHeight(x, z);
      pos.setY(i, h);
      const speck = fbm(x * 9.0, z * 9.0, 2);
      const lift = clamp01(0.45 + h * 3.5);
      const fleck = clamp01((speck - 0.55) * 2.2);
      c.copy(dark).lerp(mid, lift).lerp(crest, fleck);
      colors.set([c.r, c.g, c.b], i * 3);
      c.copy(clayDark).lerp(clayMid, lift).lerp(clayCrest, fleck);
      clayColors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("clayColor", new THREE.BufferAttribute(clayColors, 3));
    geo.computeVertexNormals();

    const grain = makeGrainTexture(full ? 512 : 256);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(14, 14);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grain,
      bumpMap: full ? grain : null,
      bumpScale: 1.6,
      roughness: 1,
      metalness: 0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uEarthMix = this.earthMix;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec3 clayColor;\nvarying vec3 vClay;")
        .replace("#include <color_vertex>", "#include <color_vertex>\nvClay = clayColor;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uEarthMix;\nvarying vec3 vClay;")
        .replace("#include <color_fragment>", "diffuseColor.rgb *= mix(vColor.rgb, vClay, uEarthMix);");
    };
    mat.customProgramCacheKey = () => "soil-earth";
    const soil = new THREE.Mesh(geo, mat);
    soil.receiveShadow = full;
    this.scene.add(soil);

    // Clods and small stones
    const count = full ? 220 : 80;
    const rocks = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
      count,
    );
    const rnd = mulberry32(7);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.55 + Math.pow(rnd(), 0.7) * 5.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 0.4;
      const s = 0.008 + Math.pow(rnd(), 3) * 0.045;
      this.tmpQ.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
      this.tmpM.compose(
        this.tmpV.set(x, this.soilHeight(x, z) + s * 0.25, z),
        this.tmpQ,
        this.tmpS.set(s, s * (0.55 + rnd() * 0.4), s * (0.8 + rnd() * 0.4)),
      );
      rocks.setMatrixAt(i, this.tmpM);
      rocks.setColorAt(i, col.set(rnd() > 0.7 ? "#6b5640" : "#3b2a1c").offsetHSL(0, 0, (rnd() - 0.5) * 0.06));
    }
    rocks.castShadow = full;
    rocks.receiveShadow = full;
    this.scene.add(rocks);
  }

  private buildSprouts() {
    const full = this.opts.tier === "full";
    const rnd = mulberry32(19);
    const stemMat = new THREE.MeshStandardMaterial({ color: "#3f6424", roughness: 0.66 });

    // Placement: a crescent behind/around the pack so fronds frame it without hiding the label.
    const spots: { x: number; z: number; h: number }[] = [];
    const back = full ? 11 : 7;
    for (let i = 0; i < back; i++) {
      const a = lerp(-Math.PI * 0.92, -Math.PI * 0.08, (i + rnd() * 0.6) / back);
      const r = 0.7 + rnd() * 1.0;
      spots.push({ x: Math.cos(a) * r * 1.3, z: Math.sin(a) * r * 0.85 - 0.2, h: 0.5 + r * 0.38 + rnd() * 0.22 });
    }
    const front = full ? [-1, 1, -1.65, 1.6] : [-1, 1];
    for (const side of front) {
      spots.push({ x: side * (0.68 + rnd() * 0.2) + Math.sign(side) * (Math.abs(side) > 1.2 ? 0.25 : 0), z: 0.35 + rnd() * 0.4, h: 0.24 + rnd() * 0.14 });
    }

    const leafGeo = makeLeafGeometry();
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0 });
    // Rachis (the stalk carrying the leaflets): unit cylinder along +X from the origin
    const rachisGeo = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true).rotateZ(-Math.PI / 2).translate(0.5, 0, 0);
    const leafSpecs: { t: number; matrix: THREE.Matrix4; sprout: number }[] = [];
    const rachisSpecs: { t: number; matrix: THREE.Matrix4; sprout: number }[] = [];
    const up = new THREE.Vector3(0, 1, 0);

    const basisFor = (dir: THREE.Vector3) => {
      const width = new THREE.Vector3().crossVectors(up, dir);
      if (width.lengthSq() < 1e-4) width.set(0, 0, 1);
      width.normalize();
      const normal = new THREE.Vector3().crossVectors(dir, width).normalize();
      return new THREE.Matrix4().makeBasis(dir, width, normal);
    };

    spots.forEach((s, si) => {
      const outward = new THREE.Vector3(s.x, 0, s.z).normalize();
      const lean = outward.clone().multiplyScalar(s.h * (0.22 + rnd() * 0.18));
      lean.x += (rnd() - 0.5) * 0.1;
      const base = new THREE.Vector3(s.x, this.soilHeight(s.x, s.z) - 0.02, s.z);
      // Arching stem: upright low down, bending outward near the top
      const curve = new THREE.CatmullRomCurve3([
        base,
        base.clone().add(new THREE.Vector3(lean.x * 0.08, s.h * 0.36, lean.z * 0.08)),
        base.clone().add(new THREE.Vector3(lean.x * 0.42, s.h * 0.72, lean.z * 0.42)),
        base.clone().add(new THREE.Vector3(lean.x, s.h * 0.94, lean.z)),
      ]);
      const segments = 48;
      const radial = 5;
      const tube = new THREE.TubeGeometry(curve, segments, 0.004 + s.h * 0.005, radial, false);
      const mesh = new THREE.Mesh(tube, stemMat);
      mesh.castShadow = full;
      mesh.geometry.setDrawRange(0, 0);
      this.scene.add(mesh);
      this.sprouts.push({ mesh, segments, radial, start: 0.2 + si * 0.085, leaves: [] });

      // Alternate pinnate fronds along the upper stem, plus a terminal frond
      const nodes = Math.max(3, Math.round(3 + s.h * 4));
      for (let k = 0; k <= nodes; k++) {
        const terminal = k === nodes;
        const t = terminal ? 0.995 : lerp(0.34, 0.9, k / nodes);
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        let dir: THREE.Vector3;
        if (terminal) {
          dir = tan.clone().add(new THREE.Vector3(0, 0.3, 0)).normalize();
        } else {
          const perp = new THREE.Vector3().crossVectors(tan, up);
          if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0);
          perp.normalize().applyAxisAngle(tan, k * 2.4 + rnd() * 0.5); // golden-angle phyllotaxis
          dir = perp.multiplyScalar(0.85).add(tan.clone().multiplyScalar(0.35)).add(new THREE.Vector3(0, 0.32, 0)).normalize();
        }
        const len = (0.14 + s.h * 0.13) * (terminal ? 0.8 : lerp(1, 0.68, k / nodes)) * (0.85 + rnd() * 0.3);
        const r = basisFor(dir);
        r.scale(new THREE.Vector3(len, 0.0028, 0.0028));
        r.setPosition(p);
        rachisSpecs.push({ t, matrix: r, sprout: si });

        const side = new THREE.Vector3().crossVectors(dir, up);
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize();
        const leafSize = (0.058 + s.h * 0.03) * (0.85 + rnd() * 0.3);
        const pairs = 4;
        for (let j = 0; j < pairs; j++) {
          const u = 0.28 + (j / pairs) * 0.68;
          const pos = p.clone().addScaledVector(dir, len * u);
          for (const sgn of [-1, 1]) {
            const ld = side.clone().multiplyScalar(sgn).addScaledVector(dir, 0.45).add(new THREE.Vector3(0, 0.12, 0)).normalize();
            const m = basisFor(ld);
            m.scale(new THREE.Vector3().setScalar(leafSize * lerp(0.9, 1.05, j / pairs)));
            m.setPosition(pos);
            leafSpecs.push({ t: t + 0.015 * (j + 1), matrix: m, sprout: si });
          }
        }
        const m = basisFor(dir.clone());
        m.scale(new THREE.Vector3().setScalar(leafSize * 1.1));
        m.setPosition(p.clone().addScaledVector(dir, len * 0.99));
        leafSpecs.push({ t: t + 0.08, matrix: m, sprout: si });
      }
    });

    const palette = ["#5d9a36", "#4f8a2e", "#6faa3f", "#3f7a28", "#7bb04a", "#87b852"].map((h) => new THREE.Color(h));
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafSpecs.length);
    this.leafMesh.castShadow = full;
    this.leafMesh.frustumCulled = false;
    leafSpecs.forEach((spec, i) => {
      this.leafMesh.setMatrixAt(i, ZERO);
      this.leafMesh.setColorAt(i, palette[Math.floor(rnd() * palette.length)]);
      this.sprouts[spec.sprout].leaves.push({ mesh: this.leafMesh, index: i, t: spec.t, matrix: spec.matrix });
    });
    this.scene.add(this.leafMesh);

    this.rachisMesh = new THREE.InstancedMesh(rachisGeo, stemMat, rachisSpecs.length);
    this.rachisMesh.frustumCulled = false;
    rachisSpecs.forEach((spec, i) => {
      this.rachisMesh.setMatrixAt(i, ZERO);
      this.sprouts[spec.sprout].leaves.push({ mesh: this.rachisMesh, index: i, t: spec.t, matrix: spec.matrix });
    });
    this.scene.add(this.rachisMesh);
  }

  /** Fruiting amla saplings either side of the pack — amla grows on trees, not from the soil. */
  private buildAmla() {
    const full = this.opts.tier === "full";
    // [x, z, height, yaw]: behind the pack's shoulders so the label stays clear
    const spots = [
      [-0.78, -0.95, 1.6, 0.6],
      [0.98, -1.05, 1.4, 2.4],
    ];
    this.amlaGroup.visible = false;
    this.scene.add(this.amlaGroup);

    // Soft contact shadow under each canopy so the trees sit in the soil, not on it
    const shadowTex = makeRadialTexture("rgba(5,3,2,0.8)", "rgba(5,3,2,0)");

    new GLTFLoader().load("/models/amla-tree.glb", (gltf) => {
      if (this.disposed) return;
      const model = gltf.scene;
      // Normalise: trunk base at the origin, unit height
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      model.position.set(-centre.x, -box.min.y, -centre.z);
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = full;
        mesh.receiveShadow = full;
        mesh.geometry.computeBoundingBox();
        const gb = mesh.geometry.boundingBox!;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.roughness = 0.72;
        mat.envMapIntensity = 0;
        this.addFoliageShader(mat, gb);
        mesh.material = mat;
      });
      spots.forEach(([x, z, h, yaw], i) => {
        const tree = new THREE.Group();
        tree.add(i === 0 ? model : model.clone());
        const y = this.soilHeight(x, z);
        tree.position.set(x, y - 0.02, z);
        tree.rotation.y = yaw;
        tree.scale.setScalar(0.0001);
        this.amlaGroup.add(tree);

        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(x + 0.08, y + 0.012, z + 0.06);
        shadow.renderOrder = 1;
        this.amlaGroup.add(shadow);

        this.amlaTrees.push({ obj: tree, s: h / size.y, yaw, shadow, w: Math.max(size.x, size.z) * (h / size.y) });
      });
    });
  }

  /**
   * A grove of real broadleaf trees on the horizon gives the garden depth. Two variants, instanced;
   * the fog melts them into the sky so they read as silhouettes behind the lit foreground.
   */
  private buildTreeline() {
    const full = this.opts.tier === "full";
    new GLTFLoader().load("/models/treeline.glb", (gltf) => {
      if (this.disposed) return;
      gltf.scene.updateMatrixWorld(true);
      const variants: { mesh: THREE.InstancedMesh; base: THREE.Matrix4; h: number }[] = [];
      const count = full ? 18 : 10;
      gltf.scene.traverse((o) => {
        const src = o as THREE.Mesh;
        if (!src.isMesh) return;
        // Keep the node's rotation/scale (the geometry is quantized), drop its offset, stand it on its base
        src.geometry.computeBoundingBox();
        const gb = src.geometry.boundingBox!;
        src.matrixWorld.decompose(this.tmpV, this.tmpQ, this.tmpS);
        const base = new THREE.Matrix4()
          .compose(new THREE.Vector3(), this.tmpQ, this.tmpS)
          .multiply(new THREE.Matrix4().makeTranslation(-(gb.min.x + gb.max.x) / 2, -gb.min.y, -(gb.min.z + gb.max.z) / 2));
        const h = gb.clone().applyMatrix4(base).getSize(this.tmpV).y;
        const mat = (src.material as THREE.MeshStandardMaterial).clone();
        // Leaf cards: alpha-test instead of blending so they sort and fog correctly
        mat.transparent = false;
        mat.alphaTest = 0.5;
        mat.side = THREE.DoubleSide;
        mat.roughness = 0.9;
        mat.color.set("#9fae86");
        const mesh = new THREE.InstancedMesh(src.geometry, mat, count);
        mesh.frustumCulled = false;
        variants.push({ mesh, base, h });
      });
      if (!variants.length) return;

      const rnd = mulberry32(53);
      const used = variants.map(() => 0);
      for (let i = 0; i < count; i++) {
        const a = lerp(-Math.PI * 0.97, -Math.PI * 0.03, (i + rnd() * 0.8) / count);
        const r = 4.6 + rnd() * 3.2;
        const x = Math.cos(a) * r * 1.5;
        const z = Math.sin(a) * r - 0.8;
        const v = variants[i % variants.length];
        const height = 2.4 + rnd() * 1.6;
        this.tmpQ.setFromAxisAngle(this.tmpS.set(0, 1, 0), rnd() * Math.PI * 2);
        this.tmpM.compose(this.tmpV.set(x, this.soilHeight(x, z) - 0.05, z), this.tmpQ, this.tmpS.setScalar(height / v.h)).multiply(v.base);
        v.mesh.setMatrixAt(used[i % variants.length]++, this.tmpM);
      }
      variants.forEach((v, i) => {
        v.mesh.count = used[i];
        this.scene.add(v.mesh);
      });
    });
  }

  /** Bel (creeper) hanging into frame from an overhanging branch; swings gently, lifts away when the amla trees grow. */
  private buildVines() {
    // [x, z, length, yaw, top]: hung from just above the frame edge (y ≈ 1.6–1.8 at these depths),
    // either side of the pack, clear of the label and the copy column
    const spots = [
      [0.95, 0.1, 1.15, 0.4, 1.8],
      [-0.62, -0.55, 1.0, 2.6, 1.9],
    ];
    new GLTFLoader().load("/models/vine.glb", (gltf) => {
      if (this.disposed) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      // pivot at the branch the vine hangs from
      model.position.set(-centre.x, -box.max.y, -centre.z);
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.roughness = 0.7;
        mat.color.set("#c9d6bb"); // settle the bright studio green into the dusk grade
        mesh.material = mat;
        mesh.castShadow = this.opts.tier === "full";
      });
      spots.forEach(([x, z, len, yaw, top], i) => {
        const pivot = new THREE.Group();
        pivot.add(i === 0 ? model : model.clone());
        pivot.position.set(x, top, z);
        pivot.rotation.y = yaw;
        pivot.scale.setScalar(len / size.y);
        this.scene.add(pivot);
        this.vines.push({ pivot, top, phase: i * 2.1 });
      });
    });
  }

  /**
   * Gives the baked-texture tree real depth: canopy self-occlusion (darker toward the trunk and
   * the lower branches), a slightly muted grade so it sits in the dusk light, and wind that bends
   * the crown while the trunk stays rooted.
   */
  private addFoliageShader(mat: THREE.MeshStandardMaterial, gb: THREE.Box3) {
    const uniforms = {
      uTime: this.foliageTime,
      uMinY: { value: gb.min.y },
      uSpanY: { value: Math.max(gb.max.y - gb.min.y, 1e-4) },
      uAxis: { value: new THREE.Vector2((gb.min.x + gb.max.x) / 2, (gb.min.z + gb.max.z) / 2) },
      uRadius: { value: Math.max(gb.max.x - gb.min.x, gb.max.z - gb.min.z) / 2 },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          uniform float uTime, uMinY, uSpanY, uRadius;
          uniform vec2 uAxis;
          varying float vOcc;`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          float hgt = clamp((position.y - uMinY) / uSpanY, 0.0, 1.0);
          vec2 off = position.xz - uAxis;
          float rad = clamp(length(off) / uRadius, 0.0, 1.0);
          // crown sways, trunk base stays put; leaf tips flutter a little faster
          float bend = hgt * hgt;
          float phase = dot(modelMatrix[3].xz, vec2(1.7, 2.3));
          float gust = sin(uTime * 0.9 + phase) * 0.6 + sin(uTime * 1.7 + phase * 1.3) * 0.4;
          transformed.x += gust * 0.022 * uSpanY * bend;
          transformed.z += cos(uTime * 1.1 + phase) * 0.012 * uSpanY * bend;
          float flutter = sin(uTime * 4.2 + position.x * 23.0 + position.z * 17.0) * 0.004 * uSpanY;
          transformed.y += flutter * rad * hgt;
          // occlusion: inner canopy and lower branches receive less sky
          float inner = 1.0 - smoothstep(0.0, 0.85, rad);
          vOcc = mix(0.5, 1.0, smoothstep(0.0, 0.75, hgt)) * (1.0 - inner * 0.42);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vOcc;")
        .replace(
          "#include <map_fragment>",
          /* glsl */ `#include <map_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.82) * vec3(0.86, 0.9, 0.8);`,
        )
        .replace(
          "#include <aomap_fragment>",
          /* glsl */ `#include <aomap_fragment>
          reflectedLight.indirectDiffuse *= vOcc;
          reflectedLight.directDiffuse *= mix(0.55, 1.0, vOcc);`,
        );
    };
    mat.customProgramCacheKey = () => "amla-foliage";
  }

  private buildPack() {
    const full = this.opts.tier === "full";
    const geo = new RoundedBoxGeometry(PACK_W, PACK_H, PACK_D, 3, 0.016);
    const frontParams = { roughness: 0.42, metalness: 0, color: "#ffffff" };
    this.packFront = full
      ? new THREE.MeshPhysicalMaterial({ ...frontParams, clearcoat: 0.3, clearcoatRoughness: 0.45 })
      : new THREE.MeshStandardMaterial(frontParams);
    const side = () => new THREE.MeshStandardMaterial({ color: "#e9eadf", roughness: 0.5 });
    this.packSides = [side(), side(), side(), side(), side()];
    const mats = [this.packSides[0], this.packSides[1], this.packSides[2], this.packSides[3], this.packFront, this.packSides[4]];
    for (const m of mats) this.addRevealShader(m);
    this.packMesh = new THREE.Mesh(geo, mats);
    this.packMesh.castShadow = false;
    this.packMesh.visible = false;
    this.pack.add(this.packMesh);
    this.pack.position.set(0, PACK_Y, 0);
    this.scene.add(this.pack);

    // Contact shadow keeps the pack grounded on every tier
    const cs = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: makeRadialTexture("rgba(5,3,2,0.75)", "rgba(5,3,2,0)"), transparent: true, depthWrite: false, opacity: 0 }),
    );
    cs.rotation.x = -Math.PI / 2;
    cs.scale.set(PACK_W * 1.9, PACK_D * 3.6, 1);
    cs.position.set(0, 0.006, 0.02);
    cs.renderOrder = 1;
    this.contactShadow = cs;
    this.scene.add(cs);

    // Coloured halo behind the product, tinted per chapter
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uColor: { value: new THREE.Color("#9dbb6a") }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float a = pow(1.0 - smoothstep(0.0, 1.0, d), 2.2) * uOpacity;
            gl_FragColor = vec4(uColor * a, a);
          }`,
      }),
    );
    halo.scale.set(4.6, 4.6, 1);
    halo.position.set(0, 0.85, -1.1);
    this.halo = halo;
    this.scene.add(halo);

    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = this.opts.packs.map(() => null);
    this.opts.packs.forEach((p, i) => {
      loader.load(
        p.url,
        (tex) => {
          if (this.disposed) return tex.dispose();
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(8, maxAniso);
          this.textures[i] = tex;
          this.sideColors[i] = sampleEdgeColor(tex.image as CanvasImageSource & { width: number; height: number });
        },
        undefined,
        () => {
          if (i === 0) this.opts.onFail?.();
        },
      );
    });
  }

  /** Noise-driven dissolve: the carton materialises from the bottom up, edge-lit like settling powder. */
  private addRevealShader(mat: THREE.MeshStandardMaterial) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uReveal = this.revealUniforms.uReveal;
      shader.uniforms.uEdge = this.revealUniforms.uEdge;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRevealPos;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRevealPos = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          varying vec3 vRevealPos;
          uniform float uReveal;
          uniform vec3 uEdge;
          float rvHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float rvNoise(vec3 x) {
            vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(rvHash(i), rvHash(i + vec3(1,0,0)), f.x), mix(rvHash(i + vec3(0,1,0)), rvHash(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(rvHash(i + vec3(0,0,1)), rvHash(i + vec3(1,0,1)), f.x), mix(rvHash(i + vec3(0,1,1)), rvHash(i + vec3(1,1,1)), f.x), f.y), f.z);
          }`,
        )
        .replace(
          "#include <clipping_planes_fragment>",
          /* glsl */ `#include <clipping_planes_fragment>
          float rvField = (vRevealPos.y / ${PACK_H.toFixed(3)} + 0.5) * 0.78 + rvNoise(vRevealPos * 46.0) * 0.22;
          float rvCut = uReveal * 1.12 - 0.06;
          if (rvField > rvCut) discard;
          float rvEdge = 1.0 - smoothstep(0.0, 0.035, rvCut - rvField);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * rvEdge * 0.55 * step(uReveal, 0.999);",
        );
    };
  }

  private buildPowder() {
    const full = this.opts.tier === "full";
    const count = full ? 2600 : 1000;
    const start = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const rand = new Float32Array(count * 4);
    const color = new Float32Array(count * 3);
    const rnd = mulberry32(53);
    const leaves = this.sprouts.flatMap((s) => s.leaves).filter((l) => l.mesh === this.leafMesh);
    const shades = ["#7da94a", "#9dbb5a", "#5f9236", "#b6c873", "#8fb04f"].map((h) => new THREE.Color(h));
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // start: random point on a random leaflet blade
      const leaf = leaves[Math.floor(rnd() * leaves.length)];
      v.set(rnd() * 0.9 + 0.05, (rnd() - 0.5) * 0.3, 0).applyMatrix4(leaf.matrix);
      start.set([v.x, v.y, v.z], i * 3);
      // target: on the pack surface (mostly the front), in pack-local space
      const onFront = rnd() < 0.82;
      if (onFront) {
        target.set([(rnd() - 0.5) * PACK_W, (rnd() - 0.5) * PACK_H, PACK_D / 2 + 0.004], i * 3);
      } else {
        const sx = rnd() < 0.5 ? -1 : 1;
        target.set([sx * (PACK_W / 2 + 0.004), (rnd() - 0.5) * PACK_H, (rnd() - 0.5) * PACK_D], i * 3);
      }
      rand.set([rnd(), rnd(), rnd(), rnd()], i * 4);
      const c = shades[Math.floor(rnd() * shades.length)];
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
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uVisible: { value: 0 },
        uBurst: { value: 0 },
        uPackMatrix: { value: new THREE.Matrix4() },
        uTint: { value: new THREE.Color("#9dbb5a") },
        uTintMix: { value: 0 },
        uSize: { value: full ? 15 : 13 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aTarget;
        attribute vec4 aRand;
        attribute vec3 aColor;
        uniform float uTime, uMorph, uVisible, uBurst, uSize, uPixelRatio, uTintMix;
        uniform mat4 uPackMatrix;
        uniform vec3 uTint;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 packPos = (uPackMatrix * vec4(aTarget, 1.0)).xyz;
          float delay = aRand.x * 0.45;
          float m = smoothstep(delay, delay + 0.55, uMorph);
          // swirl up and around on the way to the pack
          float ang = aRand.y * 6.2831;
          vec3 mid = mix(position, packPos, 0.5) + vec3(cos(ang) * 0.7, 0.55 + aRand.z * 0.7, sin(ang) * 0.5);
          float im = 1.0 - m;
          vec3 p = im * im * position + 2.0 * im * m * mid + m * m * packPos;
          // breathing drift while airborne
          float air = 4.0 * m * im;
          p += vec3(sin(uTime * 1.3 + aRand.w * 30.0), cos(uTime * 1.1 + aRand.y * 20.0), sin(uTime * 0.9 + aRand.z * 25.0)) * 0.035 * (air + uBurst);
          // chapter transitions: powder lifts off the pack and swirls around it
          vec3 c = (uPackMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 off = p - c;
          float s = sin(uBurst * (1.5 + aRand.y * 2.5));
          float co = cos(uBurst * (1.5 + aRand.y * 2.5));
          off.xz = mat2(co, -s, s, co) * off.xz;
          p = c + off * (1.0 + uBurst * (0.35 + aRand.w * 0.9)) + vec3(0.0, uBurst * aRand.z * 0.35, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.45 + aRand.w * 0.9) * uPixelRatio / -mv.z;
          vColor = mix(aColor, uTint * (0.85 + aRand.z * 0.3), uTintMix);
          vAlpha = uVisible * (0.55 + aRand.z * 0.45);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.12, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.powder = new THREE.Points(geo, mat);
    this.powder.frustumCulled = false;
    this.powder.renderOrder = 3;
    this.scene.add(this.powder);
  }

  private buildDust() {
    const count = this.opts.tier === "full" ? 260 : 110;
    const rnd = mulberry32(97);
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([(rnd() - 0.5) * 7, rnd() * 2.6, (rnd() - 0.5) * 4 - 0.6], i * 3);
      rand[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() }, uColor: { value: new THREE.Color("#f2c98f") }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aRand;
        uniform float uTime, uPixelRatio;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.02 + aRand * 0.03), 2.6);
          p.x += sin(uTime * 0.25 + aRand * 40.0) * 0.12;
          p.z += cos(uTime * 0.2 + aRand * 30.0) * 0.08;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (3.0 + aRand * 5.0) * uPixelRatio / -mv.z * 2.0;
          vA = smoothstep(0.0, 0.4, p.y) * smoothstep(2.6, 1.6, p.y) * (0.25 + aRand * 0.5);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  /* ------------------------------------------------------------------ public */

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.portrait = this.height > this.width * 1.05 || this.width < 760;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.portrait ? 36 : 30;
    // Shift the optical centre so the product sits beside (desktop) or above (mobile) the HTML copy.
    if (this.portrait) {
      this.camera.setViewOffset(this.width, this.height, 0, this.height * 0.21, this.width, this.height);
    } else {
      const shift = this.width > 1100 ? 0.2 : 0.16;
      this.camera.setViewOffset(this.width, this.height, -this.width * shift, 0, this.width, this.height);
    }
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /** Story position: 0 = hero, 1..n = chapters (fractional between). */
  setStory(f: number) {
    this.storyTarget = f;
  }

  setPointer(x: number, y: number) {
    this.pointerTarget.set(x, y);
  }

  skipIntro() {
    if (!this.introDone) this.introSpeed = 5;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.timer.reset();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.opts.canvas.removeEventListener("webglcontextlost", this.onContextLost, false);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
      for (const m of list) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    });
    for (const t of this.textures) t?.dispose();
    this.renderer.dispose();
  }

  /* ------------------------------------------------------------------ frame */

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onFail?.();
  };

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    this.timer.update(now);
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    if (!this.introDone) {
      // Hold the reveal until the first pack texture exists, so it never pops in blank.
      const canPass = this.textures[0] || this.introT < 3.3;
      if (canPass) this.introT += dt * this.introSpeed;
      if (this.introT >= INTRO_LEN) {
        this.introT = INTRO_LEN;
        this.introDone = true;
        this.opts.onIntroDone?.();
      }
    }
    this.story = damp(this.story, this.storyTarget, 6, dt);
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 3, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 3, dt);
    this.update(this.timer.getElapsed());
    this.render();
  };

  private render() {
    this.renderer.render(this.scene, this.camera);
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.opts.onFirstFrame?.();
    }
  }

  private update(time: number) {
    const it = this.introT;
    const n = this.opts.packs.length;
    const k = Math.max(0, Math.min(n - 1, this.story - 1)); // chapter float 0..n-1
    const hold = clamp01(this.story - n); // last chapter pinned: Multani Mitti clay crush
    const absorb = Math.sin(Math.PI * range(hold, 0.45, 1.0));
    const inStory = clamp01(this.story); // 0 hero → 1 first chapter

    /* camera ----------------------------------------------------------- */
    const introE = easeInOutCubic(range(it, 0, 4.7));
    const far = this.portrait ? 1.6 : 1;
    const orbit = lerp(0, -0.26 + k * 0.24, inStory);
    const dist = lerp(5.05, 4.35, inStory) * far * (1 - smooth(hold) * 0.05); // slow push-in during the crush
    const heroPos = this.tmpV.set(Math.sin(orbit) * dist, lerp(1.08, 0.98, inStory) * (this.portrait ? 1.1 : 1), Math.cos(orbit) * dist);
    const camX = lerp(0.55, heroPos.x, introE) + this.pointer.x * 0.12;
    const camY = lerp(0.3, heroPos.y, introE) + this.pointer.y * 0.06;
    const camZ = lerp(2.4, heroPos.z, introE);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, lerp(0.3, 0.64, introE), 0);

    /* sprouts ---------------------------------------------------------- */
    // ch.1 full herbs → ch.2 low herbs → ch.3 bare earth
    const storyGrowth = 1 - range(k, 0.45, 1.15) * 0.62 - range(k, 1.45, 1.9) * 0.38;
    const breath = 1 - 0.1 * Math.sin(Math.PI * range(it, 2.2, 4.2));
    for (const s of this.sprouts) {
      const g = easeOutCubic(range(it, s.start, s.start + 1.55)) * storyGrowth;
      const segs = Math.floor(g * s.segments);
      s.mesh.geometry.setDrawRange(0, segs * s.radial * 6);
      s.mesh.visible = segs > 0;
      for (const leaf of s.leaves) {
        const lg = easeOutQuint(clamp01((g - leaf.t + 0.06) / 0.2)) * breath;
        this.tmpM.copy(leaf.matrix);
        if (lg < 1) {
          this.tmpM.decompose(this.tmpV, this.tmpQ, this.tmpS);
          this.tmpS.multiplyScalar(Math.max(lg, 0.0001));
          this.tmpM.compose(this.tmpV, this.tmpQ, this.tmpS);
        }
        leaf.mesh.setMatrixAt(leaf.index, this.tmpM);
      }
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;
    this.rachisMesh.instanceMatrix.needsUpdate = true;

    /* amla trees grow in chapter 2, then recede as Multani Mitti arrives -- */
    this.amlaGrowth = Math.max(this.amlaGrowth, range(k, 0.4, 1.0));
    const amlaUp = this.amlaGrowth * (1 - easeInOutCubic(range(k, 1.3, 1.75)));
    this.amlaGroup.visible = amlaUp > 0.001 && this.amlaTrees.length > 0;
    this.foliageTime.value = time;
    if (this.amlaGroup.visible) {
      this.amlaTrees.forEach((t, i) => {
        const g = easeOutCubic(clamp01(amlaUp * 1.25 - i * 0.2));
        // grows up a touch ahead of filling out; wind sway lives in the foliage shader
        t.obj.scale.set(t.s * Math.max(g, 0.0001), t.s * Math.max(Math.min(1, g * 1.15), 0.0001), t.s * Math.max(g, 0.0001));
        const sw = t.w * (0.55 + g * 0.6);
        t.shadow.scale.set(sw, sw * 0.85, 1);
        t.shadow.material.opacity = g * 0.85;
      });
    }

    /* hanging vines frame the moringa chapters, lifting away as the amla trees take the stage */
    const vineLift = easeInOutCubic(range(k, 0.3, 0.85)) * 1.8;
    for (const v of this.vines) {
      v.pivot.position.y = v.top + vineLift;
      v.pivot.visible = vineLift < 1.79;
      v.pivot.rotation.x = Math.sin(time * 0.55 + v.phase) * 0.035;
      v.pivot.rotation.z = Math.sin(time * 0.8 + v.phase * 1.3) * 0.025;
    }

    /* pack ------------------------------------------------------------- */
    const ready = !!this.textures[0];
    const reveal = ready ? easeOutCubic(range(it, 3.3, 4.6)) : 0;
    this.revealUniforms.uReveal.value = reveal;
    this.packMesh.visible = reveal > 0.001;
    this.packMesh.castShadow = this.opts.tier === "full" && reveal > 0.7;

    // card-flip swap between chapters: edge-on at the midpoint, never shows a fake back
    let flip = 0;
    let packIndex = Math.round(k);
    let burst = 0;
    for (let j = 0; j < n - 1; j++) {
      const t = range(k, j + 0.5 - 0.2, j + 0.5 + 0.2);
      if (t > 0 && t < 1) {
        const e = easeInOutCubic(t);
        flip = e < 0.5 ? e * Math.PI : (e - 1) * Math.PI;
        packIndex = e < 0.5 ? j : j + 1;
        burst = Math.sin(Math.PI * t);
      }
    }
    if (!this.textures[packIndex]) packIndex = 0;
    if (packIndex !== this.shownPack && this.textures[packIndex]) {
      this.shownPack = packIndex;
      this.packFront.map = this.textures[packIndex];
      this.packFront.needsUpdate = true;
      const sc = this.sideColors[packIndex];
      if (sc) for (const m of this.packSides) m.color.copy(sc);
    }

    const float = Math.sin(time * 0.9) * 0.012 * reveal;
    const settle = (1 - reveal) * 0.08;
    this.pack.position.y = PACK_Y + float + settle;
    const yaw = lerp(-0.34, -0.2 + Math.sin(k * 0.9) * 0.08, inStory) + this.pointer.x * 0.16 + flip;
    this.pack.rotation.set(-this.pointer.y * 0.04, yaw, 0);
    this.pack.scale.setScalar(1 + absorb * 0.022); // the carton "takes in" the clay
    this.pack.updateMatrixWorld();
    this.clay.update(range(k, 1.62, 2.0), hold, time, this.pack.matrixWorld);
    // rises once the pack has formed, sinks back as the story moves into chapter 1
    this.heap.update(range(it, 4.3, 5.2) * (1 - smooth(range(this.story, 0.25, 0.8))));

    this.contactShadow.material.opacity = reveal * (1 - Math.abs(Math.sin(flip)) * 0.35);

    /* colour story ----------------------------------------------------- */
    const hc = this.lerpPalette(this.haloColors, k);
    this.halo.material.uniforms.uColor.value.copy(hc);
    this.halo.material.uniforms.uOpacity.value = 0.34 * easeOutCubic(range(it, 3.4, 5)) + burst * 0.12 + absorb * 0.14;
    this.halo.quaternion.copy(this.camera.quaternion);
    this.sky.material.uniforms.uTint.value.copy(hc);
    this.sky.material.uniforms.uTintMix.value = inStory;
    // Multani Mitti: the loam lightens into clay; fog follows so the horizon stays seamless
    const earth = smooth(range(k, 1.45, 1.95));
    this.earthMix.value = earth;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(SOIL_FOG).lerp(CLAY_FOG, earth);
    this.renderer.setClearColor(fog.color);

    /* powder ----------------------------------------------------------- */
    const pu = this.powder.material.uniforms;
    pu.uTime.value = time;
    pu.uMorph.value = this.introDone ? 1 : easeInOutCubic(range(it, 2.3, 4.25));
    const introVis = range(it, 2.05, 2.6) * (1 - range(it, 4.0, 4.9));
    pu.uVisible.value = Math.max(introVis, burst * 0.9);
    pu.uBurst.value = burst;
    pu.uPackMatrix.value.copy(this.pack.matrixWorld);
    // During transitions the powder takes on the incoming ingredient's colour
    const incoming = this.tintColors[Math.min(n - 1, Math.ceil(k))] ?? this.tintColors[0];
    pu.uTint.value.copy(incoming);
    pu.uTintMix.value = burst > 0 ? 0.85 : 0;
    this.powder.visible = pu.uVisible.value > 0.002;

    const du = this.dust.material.uniforms;
    du.uTime.value = time;
    du.uOpacity.value = range(it, 0, 1.5) * (0.7 + range(k, 1.4, 2.0) * 0.6);
    du.uColor.value.copy(this.tmpColor.set("#f2c98f").lerp(hc, 0.3 * inStory));

    this.keyLight.intensity = lerp(1.6, 2.4, range(it, 0, 3));
  }

  private lerpPalette(colors: THREE.Color[], k: number) {
    const i = Math.max(0, Math.min(colors.length - 1, Math.floor(k)));
    const j = Math.min(colors.length - 1, i + 1);
    return this.tmpColor.copy(colors[i]).lerp(colors[j], smooth(clamp01(k - i)));
  }
}

/* -------------------------------------------------------------- textures */

function makeLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.08, 0.34, 0.72, 0.4, 1, 0);
  shape.bezierCurveTo(0.72, -0.4, 0.08, -0.34, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color("#c9d9a8");
  const tip = new THREE.Color("#ffffff");
  const rib = new THREE.Color("#f2f7dd");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // V-fold along the midrib plus a gentle downward curl toward the tip
    pos.setZ(i, Math.abs(y) * 0.22 - x * x * 0.12);
    c.copy(base).lerp(tip, Math.min(1, x * 1.4));
    if (Math.abs(y) < 0.02) c.lerp(rib, 0.6);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeGrainTexture(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 16, (y / size) * 16, 3);
      const grit = rnd();
      const v = 150 + n * 90 + (grit > 0.93 ? 30 : grit < 0.06 ? -55 : 0);
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v * 0.94;
      img.data[i + 2] = v * 0.86;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRadialTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** Average colour of the carton's outer 2% border — used for the pack's sides. */
function sampleEdgeColor(image: CanvasImageSource & { width: number; height: number }) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 50;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, 32, 50);
  const data = ctx.getImageData(0, 0, 32, 50).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = 0; y < 50; y++) {
    for (const x of [0, 1, 30, 31]) {
      const i = (y * 32 + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return new THREE.Color().setRGB(r / count / 255, g / count / 255, b / count / 255, THREE.SRGBColorSpace);
}
