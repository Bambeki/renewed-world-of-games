import * as THREE from "three";
import { FootballState } from "./football-3d";
export type CameraMode = "follow" | "broadcast" | "close";
export function createFootballScene(
  host: HTMLDivElement,
  onContextLost: () => void,
) {
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
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 68),
      mat(i % 2 ? "#32904b" : "#2a8244"),
    );
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
  const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
  const playerGroups: {
    root: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
  }[] = [];
  const skinColors = ["#bd8057", "#774b37", "#e4b38d", "#54382d"];
  function ellipsoid(
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const m = new THREE.Mesh(sphereGeo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  for (let i = 0; i < 22; i++) {
    const team = i < 11 ? 0 : 1,
      keeper = i % 11 === 0,
      shirt = mat(
        keeper ? (team ? "#ffcc28" : "#3283fa") : team ? "#f05c49" : "#08b777",
      ),
      shorts = team ? dark : white,
      skin = mat(skinColors[i % 4]);
    const root = new THREE.Group();
    scene.add(root);
    root.scale.setScalar(1.12);
    box(root, shirt, 0, 1.46, 0, 0.67, 0.64, 0.43);
    box(root, shorts, 0, 1.02, 0, 0.68, 0.3, 0.43);
    ellipsoid(root, skin, 0, 1.86, 0, 0.11, 0.14, 0.11);
    ellipsoid(root, skin, 0, 2.08, 0.015, 0.235, 0.27, 0.22);
    ellipsoid(root, dark, 0, 2.24, -0.015, 0.24, 0.13, 0.215);
    ellipsoid(root, skin, 0, 2.07, 0.23, 0.07, 0.07, 0.06);
    for (const x of [-0.085, 0.085])
      ellipsoid(root, white, x, 2.13, 0.213, 0.035, 0.028, 0.015);
    const limbs: THREE.Group[] = [];
    for (const sign of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(sign * 0.43, 1.72, 0);
      root.add(arm);
      box(arm, shirt, 0, -0.13, 0, 0.22, 0.28, 0.24);
      box(arm, skin, 0, -0.39, 0, 0.17, 0.34, 0.18);
      ellipsoid(arm, skin, 0, -0.6, 0.01, 0.09, 0.11, 0.08);
      const leg = new THREE.Group();
      leg.position.set(sign * 0.19, 0.96, 0);
      root.add(leg);
      box(leg, skin, 0, -0.22, 0, 0.24, 0.42, 0.25);
      box(leg, shirt, 0, -0.62, 0, 0.2, 0.38, 0.21);
      box(leg, dark, 0, -0.85, 0.095, 0.25, 0.16, 0.42);
      limbs.push(leg, arm);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = team ? "#ffffff" : "#062f26";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String((i % 11) + 1), 32, 49);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const numberMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), numberMat);
    front.position.set(0, 1.5, 0.221);
    root.add(front);
    const back = front.clone();
    back.position.z = -0.221;
    back.rotation.y = Math.PI;
    root.add(back);
    playerGroups.push({
      root,
      leftLeg: limbs[0],
      leftArm: limbs[1],
      rightLeg: limbs[2],
      rightArm: limbs[3],
    });
  }
  const ballGeo = new THREE.IcosahedronGeometry(0.22, 2);
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
  const resize = new ResizeObserver(() => {
    if (disposed || !host.clientHeight) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);
  return {
    render(s: FootballState, mode: CameraMode, dt: number) {
      if (disposed) return;
      s.players.forEach((p, i) => {
        const model = playerGroups[i],
          speed = Math.hypot(p.vx, p.vz),
          swing =
            Math.sin(s.elapsed * (speed > 6 ? 15 : 10) + i) *
            Math.min(speed / 6, 1) *
            0.65;
        model.root.position.set(p.x, p.tackle > 0.65 ? -0.12 : 0, p.z);
        model.root.rotation.y = p.facing;
        model.leftLeg.rotation.x = swing;
        model.rightLeg.rotation.x = -swing;
        model.leftArm.rotation.x = -swing * 0.8;
        model.rightArm.rotation.x = swing * 0.8;
        model.leftArm.rotation.z = -0.12;
        model.rightArm.rotation.z = 0.12;
        if (p.kick > 0)
          model.rightLeg.rotation.x =
            -Math.sin((p.kick / 0.4) * Math.PI) * 1.25;
        if (p.skill > 0)
          model.root.rotation.y +=
            Math.sin((p.skill / 0.75) * Math.PI * 2) * 0.45;
        if (s.phase === "goal" && p.team === (s.restartTeam === 0 ? 1 : 0)) {
          model.leftArm.rotation.z = -2.3;
          model.rightArm.rotation.z = 2.3;
          model.root.position.y = Math.abs(Math.sin(s.phaseTime * 6)) * 0.35;
        }
      });
      ball.position.set(s.ball.x, s.ball.y, s.ball.z);
      ball.rotation.z -= s.ball.vx * dt * 3;
      ball.rotation.x += s.ball.vz * dt * 3;
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
          mode === "close" ? 13 : 24,
          z + (mode === "close" ? 21 : 34),
        );
        look.set(x, 0, z);
      }
      camera.position.lerp(desired, Math.min(1, dt * 4));
      camera.lookAt(look);
      renderer.render(scene, camera);
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
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
