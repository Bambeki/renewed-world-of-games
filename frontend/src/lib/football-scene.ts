import * as THREE from "three";
import { FootballState } from "./football-3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFootballActor } from "./football-actor";
import type { GraphicsQuality } from "./football-session";
export type CameraMode = "follow" | "broadcast" | "close" | "telecast";
export async function createFootballScene(
  host: HTMLDivElement,
  onContextLost: () => void,
  initialQuality: GraphicsQuality = "auto",
) {
  const template = await new GLTFLoader().loadAsync(
    "/assets/football/player.glb",
  );
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  let quality = initialQuality, automaticScale = 1;
  function applyGraphics() {
    const scale = quality === "performance" ? 0.7 : quality === "high" ? 1.5 : quality === "auto" ? automaticScale : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, scale));
    renderer.shadowMap.enabled = quality === "high";
    renderer.domElement.dataset.graphicsQuality = quality;
    renderer.domElement.dataset.renderScale = String(scale);
  }
  applyGraphics();
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  scene.background = new THREE.Color("#52677b");
  scene.fog = new THREE.Fog("#52677b", 115, 220);
  const camera = new THREE.PerspectiveCamera(
    48,
    host.clientWidth / host.clientHeight,
    0.1,
    280,
  );
  camera.position.set(0, 24, 34);
  scene.add(new THREE.HemisphereLight(0xe3efff, 0x293c27, 2.2));
  const sun = new THREE.DirectionalLight(0xffedcd, 2.8);
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
  // A single instanced, alpha-tested crowd surface avoids hundreds of box
  // silhouettes and keeps the stands inexpensive on mobile GPUs.
  const crowdCanvas = document.createElement("canvas");
  crowdCanvas.width = 64; crowdCanvas.height = 128;
  const crowdContext = crowdCanvas.getContext("2d");
  if (crowdContext) {
    crowdContext.fillStyle = "#f0c8ad";
    crowdContext.beginPath(); crowdContext.ellipse(32, 22, 12, 15, 0, 0, Math.PI * 2); crowdContext.fill();
    crowdContext.fillStyle = "#ffffff";
    crowdContext.beginPath(); crowdContext.moveTo(16, 42); crowdContext.lineTo(48, 42); crowdContext.lineTo(58, 87); crowdContext.lineTo(6, 87); crowdContext.fill();
    crowdContext.fillStyle = "#253543"; crowdContext.fillRect(15, 83, 15, 44); crowdContext.fillRect(35, 83, 15, 44);
  }
  const crowdTexture = new THREE.CanvasTexture(crowdCanvas);
  crowdTexture.colorSpace = THREE.SRGBColorSpace;
  const crowd = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.68, 1.25),
    new THREE.MeshBasicMaterial({map: crowdTexture, alphaTest: 0.4, side: THREE.DoubleSide}), 600,
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
  const receiverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 0.94, 32),
    new THREE.MeshBasicMaterial({color: 0x9df6e0, side: THREE.DoubleSide, transparent: true, opacity: 0.85}),
  );
  receiverRing.rotation.x = -Math.PI / 2;
  scene.add(receiverRing);
  // Ground contacts stay readable with shadows disabled on lower-power devices.
  const contacts = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({color: 0x102b1b, transparent: true, opacity: 0.24, depthWrite: false}), 22,
  );
  scene.add(contacts);
  const contactTransform = new THREE.Object3D();
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
  let measuredFrames = 0, measuredTime = 0;
  const resize = new ResizeObserver(() => {
    if (disposed || !host.clientHeight) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    resized = true;
  });
  resize.observe(host);
  return {
    setGraphics(next: GraphicsQuality) {
      quality = next;
      automaticScale = 1;
      applyGraphics();
      renderer.setSize(host.clientWidth, host.clientHeight);
      resized = true;
    },
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
        contactTransform.position.set(p.x, 0.05, p.z);
        contactTransform.rotation.set(-Math.PI / 2, 0, 0);
        contactTransform.scale.setScalar(p.inactive ? 0 : 1);
        contactTransform.updateMatrix();
        contacts.setMatrixAt(i, contactTransform.matrix);
      });
      contacts.instanceMatrix.needsUpdate = true;
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
      const receiver = s.passTarget === undefined ? null : s.players[s.passTarget];
      receiverRing.visible = Boolean(receiver && s.passTeam === 0 && s.ball.owner === null);
      if (receiver) receiverRing.position.set(receiver.x, 0.065, receiver.z);
      if (mode === "broadcast") {
        desired.set(0, 66, 88);
        look.set(0, 0, 0);
      } else if (mode === "telecast") {
        // Stable side-line rail: lead the play, retain nearby passing options,
        // and avoid rotating movement directions when possession changes.
        const focusX = THREE.MathUtils.clamp(s.ball.x * 0.8 + selected.x * 0.2, -36, 36);
        const focusZ = THREE.MathUtils.clamp(s.ball.z * 0.55, -15, 15);
        desired.set(focusX + 1, 24, focusZ + 36);
        look.set(focusX, 0, focusZ);
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
      camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      camera.lookAt(look);
      renderer.render(scene, camera);
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
      if (active && dt > 0 && quality === "auto") {
        measuredTime += dt;
        measuredFrames++;
        if (measuredFrames >= 45) {
          if (measuredTime / measuredFrames > 0.035 && automaticScale > 0.75) {
            automaticScale = 0.75;
            applyGraphics();
            renderer.setSize(host.clientWidth, host.clientHeight);
          }
          measuredFrames = measuredTime = 0;
        }
      }
      lastState = s;
      lastMode = mode;
      resized = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
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
      renderer.dispose();
      // dispose() frees GPU resources. Forcing a synthetic context loss here
      // can block the driver's command queue during a normal UI close/retry.
      renderer.domElement.remove();
      template.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose());
      });
    },
  };
}
