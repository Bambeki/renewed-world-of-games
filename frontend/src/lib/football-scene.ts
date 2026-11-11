import * as THREE from "three";
import { FootballState } from "./football-3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFootballActor } from "./football-actor";
export type CameraMode = "follow" | "broadcast" | "close";
export async function createFootballScene(
  host: HTMLDivElement,
  onContextLost: () => void,
) {
  const template = await new GLTFLoader().loadAsync(
    "/assets/football/player.glb",
  );
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, host.clientWidth < 700 ? 1 : 1.5),
  );
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = host.clientWidth >= 700;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute(
    "aria-label",
    "3D football stadium with twenty-two animated players and a ball",
  );
  renderer.domElement.setAttribute("role", "img");
  host.appendChild(renderer.domElement);
  const contextLost = (e: Event) => {
    e.preventDefault();
    onContextLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#a6c6d5");
  scene.fog = new THREE.Fog("#a6c6d5", 125, 230);
  const camera = new THREE.PerspectiveCamera(
    48,
    host.clientWidth / host.clientHeight,
    0.1,
    280,
  );
  camera.position.set(0, 24, 34);
  scene.add(new THREE.HemisphereLight(0xddefff, 0x345728, 2.5));
  const sun = new THREE.DirectionalLight(0xffedcd, 3);
  sun.position.set(-35, 65, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -65,
    right: 65,
    top: 50,
    bottom: -50,
    near: 1,
    far: 150,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const mat = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.83 });
  const ground = mat("#397b42"),
    white = mat("#faf9e9"),
    dark = mat("#152839"),
    concrete = mat("#65777f"),
    yellow = mat("#f9d96b");
  // A small repeated texture gives the turf surface detail without external downloads.
  const turfCanvas = document.createElement("canvas");
  turfCanvas.width = turfCanvas.height = 256;
  const turfContext = turfCanvas.getContext("2d");
  if (turfContext) {
    const pixels = turfContext.createImageData(256, 256);
    let seed = 9371;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = 180 + (seed % 76);
      pixels.data.set([value, value, value, 255], i);
    }
    turfContext.putImageData(pixels, 0, 0);
  }
  const turf = new THREE.CanvasTexture(turfCanvas);
  turf.wrapS = turf.wrapT = THREE.RepeatWrapping;
  turf.repeat.set(14, 9);
  turf.colorSpace = THREE.SRGBColorSpace;
  turf.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  ground.map = turf;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 140), ground);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  for (let i = 0; i < 14; i++) {
    const grass = mat(i % 2 ? "#427d43" : "#3a703c");
    grass.map = turf;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 68), grass);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(-48.75 + i * 7.5, 0.015, 0);
    strip.receiveShadow = true;
    scene.add(strip);
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf9fff0 });
  function line(points: number[][]) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(([x, z]) => new THREE.Vector3(x, 0.045, z)),
    );
    scene.add(new THREE.Line(geometry, lineMat));
  }
  line([
    [-52.5, -34],
    [52.5, -34],
    [52.5, 34],
    [-52.5, 34],
    [-52.5, -34],
  ]);
  line([
    [0, -34],
    [0, 34],
  ]);
  line(
    Array.from({ length: 65 }, (_, i) => [
      Math.cos((i / 64) * Math.PI * 2) * 9.15,
      Math.sin((i / 64) * Math.PI * 2) * 9.15,
    ]),
  );
  for (const end of [-1, 1]) {
    line([
      [end * 52.5, -20.16],
      [end * 36, -20.16],
      [end * 36, 20.16],
      [end * 52.5, 20.16],
    ]);
    line([
      [end * 52.5, -9.16],
      [end * 47, -9.16],
      [end * 47, 9.16],
      [end * 52.5, 9.16],
    ]);
    const netMat = new THREE.LineBasicMaterial({
      color: 0xe3eeef,
      transparent: true,
      opacity: 0.48,
    });
    const netPoints: THREE.Vector3[] = [];
    const x = end * 52.6,
      bx = end * 55.1;
    function net(a: number[], b: number[]) {
      netPoints.push(
        new THREE.Vector3(...(a as [number, number, number])),
        new THREE.Vector3(...(b as [number, number, number])),
      );
    }
    for (let z = -3.66; z <= 3.67; z += 0.46) {
      net([bx, 0, z], [bx, 2.44, z]);
      net([x, 2.44, z], [bx, 2.44, z]);
    }
    for (let y = 0; y <= 2.45; y += 0.4) {
      net([bx, y, -3.66], [bx, y, 3.66]);
      net([x, y, -3.66], [bx, y, -3.66]);
      net([x, y, 3.66], [bx, y, 3.66]);
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(netPoints);
    scene.add(new THREE.LineSegments(geometry, netMat));
    box(scene, white, x, 1.22, -3.66, 0.14, 2.44, 0.14);
    box(scene, white, x, 1.22, 3.66, 0.14, 2.44, 0.14);
    box(scene, white, x, 2.44, 0, 0.14, 0.14, 7.46);
    for (const z of [-34, 34]) {
      box(scene, white, end * 52.5, 1, z, 0.045, 2, 0.045);
      box(scene, yellow, end * 52.5 + 0.25, 1.8, z, 0.5, 0.35, 0.03);
    }
  }
  // Stands, advertising boards and an instanced crowd keep draw calls bounded.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++)
      box(
        scene,
        concrete,
        0,
        1 + row * 1.25,
        side * (43 + row * 2.6),
        120,
        1.2,
        2.8,
      );
    box(scene, dark, 0, 0.65, side * 38, 116, 1.3, 0.35);
    for (let k = -3; k <= 3; k++)
      box(
        scene,
        k % 2 ? yellow : white,
        k * 16,
        0.7,
        side * 37.78,
        12,
        0.65,
        0.06,
      );
    for (let row = 0; row < 4; row++)
      box(
        scene,
        concrete,
        side * (63 + row * 2.8),
        1 + row * 1.25,
        0,
        2.8,
        1.2,
        75,
      );
  }
  const crowd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.58, 1.05, 0.6),
    mat("#ffffff"),
    600,
  );
  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();
  for (let i = 0; i < 600; i++) {
    const side = i < 300 ? -1 : 1;
    const n = i % 300,
      row = Math.floor(n / 60);
    dummy.position.set(
      ((n % 60) - 29.5) * 1.85,
      2 + row * 1.25,
      side * (43 + row * 2.6),
    );
    dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix);
    colour.setHSL((i * 0.137) % 1, 0.45, 0.32 + (i % 3) * 0.13);
    crowd.setColorAt(i, colour);
  }
  scene.add(crowd);
  for (const x of [-57, 57])
    for (const z of [-40, 40]) {
      box(scene, dark, x, 12, z, 0.35, 24, 0.35);
      box(scene, white, x, 24, z, 5, 1, 1.5);
    }
  const playerGroups = Array.from({ length: 22 }, (_, i) => {
    const actor = createFootballActor(template, i);
    scene.add(actor.root);
    return actor;
  });
  const ballGeo = new THREE.IcosahedronGeometry(0.14, 3);
  const ballColors = [];
  for (let i = 0; i < ballGeo.attributes.position.count; i++) {
    const c = Math.floor(i / 3) % 5 === 0 ? 0.08 : 0.98;
    ballColors.push(c, c, c);
  }
  ballGeo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(ballColors, 3),
  );
  const ball = new THREE.Mesh(
    ballGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }),
  );
  ball.castShadow = true;
  scene.add(ball);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.9, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe46a, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const ballShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 20),
    new THREE.MeshBasicMaterial({
      color: 0x123b24,
      transparent: true,
      opacity: 0.45,
    }),
  );
  ballShadow.rotation.x = -Math.PI / 2;
  scene.add(ballShadow);
  const look = new THREE.Vector3(),
    desired = new THREE.Vector3();
  let disposed = false;
  let lastState: FootballState | null = null;
  let lastMode: CameraMode | null = null;
  let resized = true;
  const resize = new ResizeObserver(() => {
    if (disposed || !host.clientHeight) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    resized = true;
  });
  resize.observe(host);
  return {
    render(s: FootballState, mode: CameraMode, dt: number, active = true) {
      if (disposed) return;
      if (
        !active &&
        s === lastState &&
        mode === lastMode &&
        !resized &&
        camera.position.distanceTo(desired) < 0.002
      )
        return;
      renderer.domElement.setAttribute(
        "aria-label",
        s.training
          ? "3D training pitch with one attacker and one goalkeeper"
          : "3D stadium with twenty-two footballers and a ball",
      );
      s.players.forEach((p, i) => {
        const celebrate = s.phase === "goal" && p.team !== s.restartTeam;
        playerGroups[i].update(
          p,
          s.ball.owner === i,
          active ? dt : 0,
          i === s.selected ? s.charge : 0,
          celebrate,
        );
      });
      renderer.domElement.dataset.playerPose = playerGroups[s.selected].pose();
      ball.position.set(s.ball.x, Math.max(0.14, s.ball.y - 0.08), s.ball.z);
      if (active) {
        ball.rotation.z -= s.ball.vx * dt * 3;
        ball.rotation.x += s.ball.vz * dt * 3;
      }
      ballShadow.position.set(s.ball.x, 0.04, s.ball.z);
      ballShadow.scale.setScalar(1 + Math.max(0, s.ball.y - 0.22) * 0.2);
      const selected = s.players[s.selected];
      ring.position.set(selected.x, 0.06, selected.z);
      if (mode === "broadcast") {
        desired.set(0, 66, 88);
        look.set(0, 0, 0);
      } else {
        const x = THREE.MathUtils.clamp(s.ball.x, -40, 40),
          z = THREE.MathUtils.clamp(s.ball.z, -22, 22);
        desired.set(
          x + 2,
          mode === "close" ? 6.5 : 12,
          z + (mode === "close" ? 13 : 24),
        );
        look.set(x, 0, z);
      }
      camera.position.lerp(desired, Math.min(1, dt * 4));
      camera.lookAt(look);
      renderer.render(scene, camera);
      lastState = s;
      lastMode = mode;
      resized = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;console.info("RWOG_DISPOSE_START");
      resize.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          for (const m of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            materials.add(m);
            const map = (m as THREE.MeshStandardMaterial).map;
            if (map) textures.add(map);
          }
      });
      playerGroups.forEach((actor) => actor.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      console.info("RWOG_DISPOSE_OBJECTS");renderer.dispose();console.info("RWOG_DISPOSE_RENDERER");
      renderer.forceContextLoss();console.info("RWOG_DISPOSE_CONTEXT");
      renderer.domElement.remove();
    },
  };
}
