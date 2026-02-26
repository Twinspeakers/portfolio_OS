import type { SceneAdapterFactory } from "@/lib/3d/adapter";

type BabylonConfig = {
  sceneId?: string;
};

type TransformNodeType = import("@babylonjs/core/Meshes/transformNode").TransformNode;

type FishBehaviorState = "cruise" | "chase" | "flee";

type FishSpeciesProfile = {
  id: string;
  commonName: string;
  scientificName: string;
  baseSpeed: number;
  aggression: number;
  timidness: number;
  schooling: number;
  preferredDepthNorm: number;
  depthVariance: number;
  cruisingWidth: number;
  cruisingDepth: number;
  modelScale: number;
  tint: [number, number, number];
};

type FishVisual = {
  root: TransformNodeType;
  species: FishSpeciesProfile;
  tailPivot?: TransformNodeType;
  dorsalPivot?: TransformNodeType;
  pectoralLeftPivot?: TransformNodeType;
  pectoralRightPivot?: TransformNodeType;
  speed: number;
  phase: number;
  laneYNorm: number;
  laneZNorm: number;
  pathWidthNorm: number;
  pathDepthNorm: number;
  rollFactor: number;
  state: FishBehaviorState;
  stateTimerSec: number;
  targetIndex: number | null;
};

type SwimTarget = {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  cycle: number;
};

const HERO_FISH_MODEL_PATH = "/models/fish/hero-fish.glb";

// Real aquarium species with behavior traits used to drive movement and interactions.
const FISH_STOCK: FishSpeciesProfile[] = [
  {
    id: "goldfish",
    commonName: "Goldfish",
    scientificName: "Carassius auratus",
    baseSpeed: 0.2,
    aggression: 0.08,
    timidness: 0.22,
    schooling: 0.24,
    preferredDepthNorm: -0.12,
    depthVariance: 0.5,
    cruisingWidth: 0.62,
    cruisingDepth: 0.32,
    modelScale: 0.62,
    tint: [1, 0.66, 0.24]
  },
  {
    id: "neon_tetra",
    commonName: "Neon Tetra",
    scientificName: "Paracheirodon innesi",
    baseSpeed: 0.36,
    aggression: 0.04,
    timidness: 0.84,
    schooling: 0.96,
    preferredDepthNorm: 0.02,
    depthVariance: 0.36,
    cruisingWidth: 0.7,
    cruisingDepth: 0.24,
    modelScale: 0.52,
    tint: [0.2, 0.88, 1]
  },
  {
    id: "guppy",
    commonName: "Guppy",
    scientificName: "Poecilia reticulata",
    baseSpeed: 0.34,
    aggression: 0.1,
    timidness: 0.4,
    schooling: 0.42,
    preferredDepthNorm: 0.34,
    depthVariance: 0.42,
    cruisingWidth: 0.66,
    cruisingDepth: 0.28,
    modelScale: 0.52,
    tint: [1, 0.58, 0.28]
  },
  {
    id: "corydoras",
    commonName: "Corydoras Catfish",
    scientificName: "Corydoras aeneus",
    baseSpeed: 0.22,
    aggression: 0.02,
    timidness: 0.45,
    schooling: 0.62,
    preferredDepthNorm: -0.72,
    depthVariance: 0.24,
    cruisingWidth: 0.52,
    cruisingDepth: 0.2,
    modelScale: 0.58,
    tint: [0.68, 0.75, 0.82]
  },
  {
    id: "angelfish",
    commonName: "Freshwater Angelfish",
    scientificName: "Pterophyllum scalare",
    baseSpeed: 0.3,
    aggression: 0.86,
    timidness: 0.1,
    schooling: 0.08,
    preferredDepthNorm: 0.18,
    depthVariance: 0.36,
    cruisingWidth: 0.58,
    cruisingDepth: 0.24,
    modelScale: 0.68,
    tint: [0.56, 0.78, 1]
  },
  {
    id: "cherry_barb",
    commonName: "Cherry Barb",
    scientificName: "Puntius titteya",
    baseSpeed: 0.31,
    aggression: 0.34,
    timidness: 0.3,
    schooling: 0.66,
    preferredDepthNorm: -0.02,
    depthVariance: 0.38,
    cruisingWidth: 0.64,
    cruisingDepth: 0.26,
    modelScale: 0.56,
    tint: [0.95, 0.36, 0.44]
  },
  {
    id: "dwarf_gourami",
    commonName: "Dwarf Gourami",
    scientificName: "Trichogaster lalius",
    baseSpeed: 0.27,
    aggression: 0.64,
    timidness: 0.24,
    schooling: 0.18,
    preferredDepthNorm: 0.22,
    depthVariance: 0.34,
    cruisingWidth: 0.56,
    cruisingDepth: 0.22,
    modelScale: 0.63,
    tint: [0.72, 0.82, 1]
  }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function noise01(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export const createBabylonAdapter: SceneAdapterFactory<BabylonConfig> = async (host, options) => {
  if (!(host instanceof HTMLCanvasElement)) {
    throw new Error("Babylon adapter requires a canvas host element.");
  }

  const canvas = host;

  const [
    { Engine },
    { Scene },
    { ArcRotateCamera },
    { Vector3 },
    { HemisphericLight },
    { PointLight },
    { Color4 },
    { MeshBuilder },
    { StandardMaterial },
    { TransformNode },
    { GlowLayer },
    { SceneLoader }
  ] = await Promise.all([
    import("@babylonjs/core/Engines/engine"),
    import("@babylonjs/core/scene"),
    import("@babylonjs/core/Cameras/arcRotateCamera"),
    import("@babylonjs/core/Maths/math.vector"),
    import("@babylonjs/core/Lights/hemisphericLight"),
    import("@babylonjs/core/Lights/pointLight"),
    import("@babylonjs/core/Maths/math.color"),
    import("@babylonjs/core/Meshes/meshBuilder"),
    import("@babylonjs/core/Materials/standardMaterial"),
    import("@babylonjs/core/Meshes/transformNode"),
    import("@babylonjs/core/Layers/glowLayer"),
    import("@babylonjs/core/Loading/sceneLoader")
  ]);

  // Register GLB/GLTF loader plugin.
  await import("@babylonjs/loaders/glTF");

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);

  const dpr = Math.max(1, Math.min(2, options.devicePixelRatio || 1));
  engine.setHardwareScalingLevel(1 / dpr);

  const camera = new ArcRotateCamera("hero-camera", Math.PI * 1.36, Math.PI * 0.5, 10.8, new Vector3(0, -0.04, 0), scene);
  camera.lowerRadiusLimit = 9.1;
  camera.upperRadiusLimit = 14;
  camera.lowerBetaLimit = Math.PI * 0.3;
  camera.upperBetaLimit = Math.PI * 0.72;
  camera.wheelPrecision = 42;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, false);

  const hemi = new HemisphericLight("fish-hemi", new Vector3(0.08, 1, -0.2), scene);
  hemi.intensity = 0.88;
  const keyLight = new PointLight("fish-key", new Vector3(0.7, 2.2, 4.2), scene);
  keyLight.intensity = 1.05;

  const glow = new GlowLayer("fish-glow", scene, {
    blurKernelSize: 22
  });
  glow.intensity = 0.26;

  const fishCount = FISH_STOCK.length;
  const fishVisuals: FishVisual[] = [];

  const createMotionProfile = (index: number, species: FishSpeciesProfile): Omit<FishVisual, "root" | "species" | "tailPivot" | "dorsalPivot" | "pectoralLeftPivot" | "pectoralRightPivot"> => {
    const n1 = noise01(index * 1.37 + 2.1);
    const n2 = noise01(index * 3.91 + 5.4);
    const n3 = noise01(index * 2.53 + 9.6);
    const n4 = noise01(index * 4.17 + 8.9);
    const n5 = noise01(index * 6.31 + 1.7);
    const n6 = noise01(index * 7.57 + 4.8);
    const n7 = noise01(index * 5.13 + 6.2);
    return {
      speed: species.baseSpeed * (0.9 + n1 * 0.24),
      phase: n2 * Math.PI * 2,
      laneYNorm: clamp(
        species.preferredDepthNorm + (n3 - 0.5) * species.depthVariance,
        -0.88,
        0.88
      ),
      laneZNorm: -0.82 + n4 * 1.64,
      pathWidthNorm: clamp(species.cruisingWidth + (n5 - 0.5) * 0.18, 0.46, 0.9),
      pathDepthNorm: clamp(species.cruisingDepth + (n6 - 0.5) * 0.12, 0.18, 0.46),
      rollFactor: 0.04 + n7 * 0.024,
      state: "cruise",
      stateTimerSec: 1.2 + n6 * 1.8,
      targetIndex: null
    };
  };

  const createProceduralFish = (index: number, species: FishSpeciesProfile): FishVisual => {
    const root = new TransformNode(`fish-root-${index}`, scene);

    const scaleNoise = noise01(index * 8.17 + 1.3);
    const fishScale = species.modelScale * (0.9 + scaleNoise * 0.2);
    const body = MeshBuilder.CreateSphere(`fish-body-${index}`, { diameter: 0.5, segments: 18 }, scene);
    body.scaling = new Vector3(1.52 * fishScale, 0.82 * fishScale, 0.62 * fishScale);
    body.parent = root;

    const head = MeshBuilder.CreateSphere(`fish-head-${index}`, { diameter: 0.38, segments: 16 }, scene);
    head.scaling = new Vector3(1.14 * fishScale, 0.92 * fishScale, 0.9 * fishScale);
    head.position.x = 0.18 * fishScale;
    head.parent = root;

    const tailPivot = new TransformNode(`fish-tail-pivot-${index}`, scene);
    tailPivot.position.x = -0.4 * fishScale;
    tailPivot.parent = root;
    const tail = MeshBuilder.CreateCylinder(
      `fish-tail-${index}`,
      { height: 0.32 * fishScale, diameterTop: 0, diameterBottom: 0.36 * fishScale, tessellation: 3 },
      scene
    );
    tail.rotation.z = Math.PI / 2;
    tail.parent = tailPivot;

    const dorsalPivot = new TransformNode(`fish-dorsal-pivot-${index}`, scene);
    dorsalPivot.position.y = 0.22 * fishScale;
    dorsalPivot.position.x = -0.04 * fishScale;
    dorsalPivot.parent = root;
    const dorsal = MeshBuilder.CreateSphere(`fish-dorsal-${index}`, { diameter: 0.16 * fishScale, segments: 10 }, scene);
    dorsal.scaling = new Vector3(0.56, 1.2, 0.3);
    dorsal.parent = dorsalPivot;

    const pectoralLeftPivot = new TransformNode(`fish-pectoral-left-pivot-${index}`, scene);
    pectoralLeftPivot.position.x = 0.04 * fishScale;
    pectoralLeftPivot.position.z = 0.14 * fishScale;
    pectoralLeftPivot.parent = root;
    const pectoralLeft = MeshBuilder.CreateSphere(
      `fish-pectoral-left-${index}`,
      { diameter: 0.12 * fishScale, segments: 8 },
      scene
    );
    pectoralLeft.scaling = new Vector3(0.24, 0.9, 0.6);
    pectoralLeft.parent = pectoralLeftPivot;

    const pectoralRightPivot = new TransformNode(`fish-pectoral-right-pivot-${index}`, scene);
    pectoralRightPivot.position.x = 0.04 * fishScale;
    pectoralRightPivot.position.z = -0.14 * fishScale;
    pectoralRightPivot.parent = root;
    const pectoralRight = MeshBuilder.CreateSphere(
      `fish-pectoral-right-${index}`,
      { diameter: 0.12 * fishScale, segments: 8 },
      scene
    );
    pectoralRight.scaling = new Vector3(0.24, 0.9, 0.6);
    pectoralRight.parent = pectoralRightPivot;

    const eyeLeft = MeshBuilder.CreateSphere(`fish-eye-left-${index}`, { diameter: 0.05 * fishScale, segments: 8 }, scene);
    eyeLeft.position.x = 0.23 * fishScale;
    eyeLeft.position.y = 0.05 * fishScale;
    eyeLeft.position.z = 0.1 * fishScale;
    eyeLeft.parent = root;

    const eyeRight = MeshBuilder.CreateSphere(
      `fish-eye-right-${index}`,
      { diameter: 0.05 * fishScale, segments: 8 },
      scene
    );
    eyeRight.position.x = 0.23 * fishScale;
    eyeRight.position.y = 0.05 * fishScale;
    eyeRight.position.z = -0.1 * fishScale;
    eyeRight.parent = root;

    const [r, g, b] = species.tint;
    const bodyMaterial = new StandardMaterial(`fish-body-material-${index}`, scene);
    bodyMaterial.diffuseColor.set(r, g, b);
    bodyMaterial.emissiveColor.set(r * 0.08, g * 0.08, b * 0.08);
    bodyMaterial.specularColor.set(0.16, 0.2, 0.24);
    bodyMaterial.specularPower = 40;

    const finMaterial = new StandardMaterial(`fish-fin-material-${index}`, scene);
    finMaterial.diffuseColor.set(clamp(r + 0.08, 0, 1), clamp(g + 0.08, 0, 1), clamp(b + 0.08, 0, 1));
    finMaterial.emissiveColor.set(r * 0.04, g * 0.04, b * 0.04);
    finMaterial.alpha = 0.9;
    finMaterial.backFaceCulling = false;

    const eyeMaterial = new StandardMaterial(`fish-eye-material-${index}`, scene);
    eyeMaterial.diffuseColor.set(0.08, 0.1, 0.14);
    eyeMaterial.specularColor.set(0.9, 0.9, 0.95);
    eyeMaterial.specularPower = 90;

    body.material = bodyMaterial;
    head.material = bodyMaterial;
    tail.material = finMaterial;
    dorsal.material = finMaterial;
    pectoralLeft.material = finMaterial;
    pectoralRight.material = finMaterial;
    eyeLeft.material = eyeMaterial;
    eyeRight.material = eyeMaterial;

    return {
      root,
      species,
      tailPivot,
      dorsalPivot,
      pectoralLeftPivot,
      pectoralRightPivot,
      ...createMotionProfile(index, species)
    };
  };

  const spawnModelFish = async (): Promise<boolean> => {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync("", HERO_FISH_MODEL_PATH, scene);
      for (let index = 0; index < fishCount; index += 1) {
        const species = FISH_STOCK[index];
        const instanced = container.instantiateModelsToScene((name) => `${name}-fish-${index}`, false);
        const root = new TransformNode(`fish-root-${index}`, scene);

        if (instanced.rootNodes.length === 0) {
          root.dispose(false, true);
          continue;
        }

        for (const node of instanced.rootNodes) {
          node.parent = root;
        }

        const scaleNoise = noise01(index * 8.17 + 1.3);
        const scale = species.modelScale * (0.9 + scaleNoise * 0.2);
        root.scaling.set(scale, scale, scale);
        root.metadata = {
          species: species.commonName,
          scientificName: species.scientificName
        };

        if (instanced.animationGroups.length > 0) {
          for (const animationGroup of instanced.animationGroups) {
            animationGroup.start(true, 0.9 + (index % 3) * 0.08);
          }
        }

        fishVisuals.push({
          root,
          species,
          ...createMotionProfile(index, species)
        });
      }

      container.dispose();
      return fishVisuals.length > 0;
    } catch (error) {
      console.info("No GLB fish model found at /public/models/fish/hero-fish.glb. Using procedural fish fallback.", error);
      return false;
    }
  };

  const loadedModelFish = await spawnModelFish();
  if (!loadedModelFish) {
    for (let index = 0; index < fishCount; index += 1) {
      fishVisuals.push(createProceduralFish(index, FISH_STOCK[index]));
    }
  }

  const readSwimBounds = () => {
    const renderWidth = Math.max(1, engine.getRenderWidth());
    const renderHeight = Math.max(1, engine.getRenderHeight());
    const aspect = renderWidth / renderHeight;
    const halfHeight = camera.radius * Math.tan(camera.fov * 0.5);
    const halfWidth = halfHeight * aspect;
    return {
      x: halfWidth * 0.9,
      y: halfHeight * 0.9,
      z: Math.max(0.7, Math.min(2.7, halfHeight * 0.56))
    };
  };

  let time = 0;
  scene.registerBeforeRender(() => {
    const dt = engine.getDeltaTime() * 0.001;
    time += dt;
    const swimBounds = readSwimBounds();

    const currentPositions = fishVisuals.map((fish) => ({
      x: fish.root.position.x,
      y: fish.root.position.y,
      z: fish.root.position.z
    }));

    for (let i = 0; i < fishVisuals.length; i += 1) {
      const fish = fishVisuals[i];
      fish.stateTimerSec -= dt;
      if (fish.stateTimerSec > 0) continue;

      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      let threatIndex = -1;
      let threatDistance = Number.POSITIVE_INFINITY;

      for (let j = 0; j < fishVisuals.length; j += 1) {
        if (i === j) continue;
        const dx = currentPositions[j].x - currentPositions[i].x;
        const dy = currentPositions[j].y - currentPositions[i].y;
        const dz = currentPositions[j].z - currentPositions[i].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = j;
        }
        if (fishVisuals[j].species.aggression > 0.58 && distance < threatDistance) {
          threatDistance = distance;
          threatIndex = j;
        }
      }

      const threatRadius = 0.95 + fish.species.timidness * 1.45;
      if (fish.species.timidness > 0.34 && threatIndex >= 0 && threatDistance < threatRadius) {
        fish.state = "flee";
        fish.targetIndex = threatIndex;
        fish.stateTimerSec = 0.85 + fish.species.timidness * 1.5;
        continue;
      }

      const chaseRadius = 0.95 + fish.species.aggression * 1.35;
      if (
        fish.species.aggression > 0.58 &&
        nearestIndex >= 0 &&
        nearestDistance < chaseRadius &&
        fishVisuals[nearestIndex].species.id !== fish.species.id
      ) {
        fish.state = "chase";
        fish.targetIndex = nearestIndex;
        fish.stateTimerSec = 0.8 + fish.species.aggression * 1.3;
      } else {
        fish.state = "cruise";
        fish.targetIndex = null;
        fish.stateTimerSec = 1.35 + (1 - fish.species.aggression) * 1.35;
      }
    }

    const baseTargets: SwimTarget[] = fishVisuals.map((fish) => {
      const stateSpeedMultiplier = fish.state === "chase" ? 1.24 : fish.state === "flee" ? 1.17 : 1;
      const cycle = time * fish.speed * stateSpeedMultiplier + fish.phase;
      const xAmplitude = swimBounds.x * fish.pathWidthNorm;
      const zAmplitude = swimBounds.z * fish.pathDepthNorm;
      const x = Math.sin(cycle) * xAmplitude;
      const z = fish.laneZNorm * swimBounds.z * 0.86 + Math.cos(cycle * 0.7 + fish.phase) * zAmplitude;
      const y = clamp(
        fish.laneYNorm * swimBounds.y * 0.84 + Math.sin(cycle * 1.2 + fish.phase * 0.6) * (swimBounds.y * 0.08),
        -swimBounds.y,
        swimBounds.y
      );

      const dx = Math.cos(cycle) * xAmplitude * fish.speed * stateSpeedMultiplier;
      const dz = -Math.sin(cycle * 0.7 + fish.phase) * zAmplitude * fish.speed * 0.7 * stateSpeedMultiplier;
      return { x, y, z, dx, dz, cycle };
    });

    const schoolCenters = new Map<string, { x: number; y: number; z: number; count: number }>();
    for (let i = 0; i < fishVisuals.length; i += 1) {
      const fish = fishVisuals[i];
      if (fish.species.schooling < 0.55) continue;
      const key = fish.species.id;
      const center = schoolCenters.get(key) ?? { x: 0, y: 0, z: 0, count: 0 };
      center.x += baseTargets[i].x;
      center.y += baseTargets[i].y;
      center.z += baseTargets[i].z;
      center.count += 1;
      schoolCenters.set(key, center);
    }

    for (let i = 0; i < fishVisuals.length; i += 1) {
      const fish = fishVisuals[i];
      const target = baseTargets[i];
      let desiredX = target.x;
      let desiredY = target.y;
      let desiredZ = target.z;

      if (fish.species.schooling >= 0.55) {
        const center = schoolCenters.get(fish.species.id);
        if (center && center.count > 1) {
          const centerX = center.x / center.count;
          const centerY = center.y / center.count;
          const centerZ = center.z / center.count;
          const schoolingPull = 0.1 + fish.species.schooling * 0.22;
          desiredX = desiredX * (1 - schoolingPull) + centerX * schoolingPull;
          desiredY = desiredY * (1 - schoolingPull) + centerY * schoolingPull;
          desiredZ = desiredZ * (1 - schoolingPull) + centerZ * schoolingPull;
        }
      }

      if (fish.state === "chase" && fish.targetIndex !== null && fishVisuals[fish.targetIndex]) {
        const prey = currentPositions[fish.targetIndex];
        const pull = 0.34 + fish.species.aggression * 0.28;
        desiredX += (prey.x - desiredX) * pull;
        desiredY += (prey.y - desiredY) * (pull * 0.72);
        desiredZ += (prey.z - desiredZ) * pull;
      }

      if (fish.state === "flee" && fish.targetIndex !== null && fishVisuals[fish.targetIndex]) {
        const predator = currentPositions[fish.targetIndex];
        let awayX = desiredX - predator.x;
        let awayY = desiredY - predator.y;
        let awayZ = desiredZ - predator.z;
        const length = Math.sqrt(awayX * awayX + awayY * awayY + awayZ * awayZ) || 1;
        awayX /= length;
        awayY /= length;
        awayZ /= length;

        desiredX += awayX * (0.34 + fish.species.timidness * 0.46);
        desiredY += awayY * 0.12;
        desiredZ += awayZ * (0.28 + fish.species.timidness * 0.42);
      }

      desiredX = clamp(desiredX, -swimBounds.x * 0.96, swimBounds.x * 0.96);
      desiredY = clamp(desiredY, -swimBounds.y * 0.92, swimBounds.y * 0.92);
      desiredZ = clamp(desiredZ, -swimBounds.z * 0.95, swimBounds.z * 0.95);

      const prevX = fish.root.position.x;
      const prevY = fish.root.position.y;
      const prevZ = fish.root.position.z;

      const stateFollowBoost = fish.state === "chase" ? 5.2 : fish.state === "flee" ? 4.7 : 4.2;
      const follow = clamp(dt * (2 + fish.speed * stateFollowBoost), 0, 1);
      fish.root.position.x = prevX + (desiredX - prevX) * follow;
      fish.root.position.y = prevY + (desiredY - prevY) * follow;
      fish.root.position.z = prevZ + (desiredZ - prevZ) * follow;

      const moveX = fish.root.position.x - prevX;
      const moveZ = fish.root.position.z - prevZ;
      const headingX = Math.abs(moveX) + Math.abs(moveZ) > 0.00001 ? moveX : target.dx;
      const headingZ = Math.abs(moveX) + Math.abs(moveZ) > 0.00001 ? moveZ : target.dz;

      fish.root.rotation.y = Math.atan2(headingZ, headingX);
      fish.root.rotation.x = Math.sin(target.cycle * 0.95) * 0.03;
      fish.root.rotation.z =
        Math.sin(target.cycle * 2 + i * 0.31) * fish.rollFactor +
        (fish.state === "chase" ? 0.028 : fish.state === "flee" ? -0.018 : 0);

      const finRateMultiplier = fish.state === "chase" ? 1.32 : fish.state === "flee" ? 1.18 : 1;
      const finRate = (7.6 + fish.speed * 3.4) * finRateMultiplier;
      if (fish.tailPivot) {
        const amplitude = fish.state === "chase" ? 0.72 : fish.state === "flee" ? 0.64 : 0.58;
        fish.tailPivot.rotation.y = Math.sin(target.cycle * finRate) * amplitude;
      }
      if (fish.dorsalPivot) {
        fish.dorsalPivot.rotation.z = Math.sin(target.cycle * (finRate * 0.5)) * 0.08;
      }
      if (fish.pectoralLeftPivot) {
        fish.pectoralLeftPivot.rotation.z = Math.sin(target.cycle * (finRate * 0.82) + 0.5) * 0.12;
      }
      if (fish.pectoralRightPivot) {
        fish.pectoralRightPivot.rotation.z = -Math.sin(target.cycle * (finRate * 0.82) + 0.5) * 0.12;
      }
    }
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  return {
    resize(next) {
      const nextDpr = Math.max(1, Math.min(2, next.devicePixelRatio || 1));
      engine.setHardwareScalingLevel(1 / nextDpr);
      engine.resize();
    },
    dispose() {
      camera.detachControl();
      scene.dispose();
      engine.dispose();
    }
  };
};
