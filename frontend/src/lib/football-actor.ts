import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Athlete } from "./football-3d";

/** A real skinned humanoid, with independent skeleton and blended locomotion. */
export function createFootballActor(template: GLTF, index: number) {
  const root = new THREE.Group();
  const body = clone(template.scene);
  root.add(body);
  root.scale.setScalar(1.05);
  root.updateMatrixWorld(true);
  const team = index < 11 ? 0 : 1,
    keeper = index % 11 === 0;
  const shirt = new THREE.Color(
    keeper ? (team ? "#f2cb4b" : "#53a0ef") : team ? "#e94a45" : "#078f72",
  );
  const shorts = new THREE.Color(team ? "#162339" : "#f3f0de");
  const skin = new THREE.Color(
    ["#b67b55", "#714a36", "#dfab87", "#50382e"][index % 4],
  );
  const boots = new THREE.Color(index % 3 ? "#142132" : "#e5eea2");
  const point = new THREE.Vector3();
  const bones = new Map<string, THREE.Bone>();
  body.traverse((object) => {
    if ((object as THREE.Bone).isBone)
      bones.set(object.name, object as THREE.Bone);
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.geometry = mesh.geometry.clone();
    const positions = mesh.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      point
        .fromBufferAttribute(positions, i)
        .applyMatrix4(mesh.matrixWorld)
        .divideScalar(1.05);
      let color = skin;
      if (mesh.name === "Eyes") color = new THREE.Color("#e4e8df");
      else if (mesh.name === "Eyebrows") color = new THREE.Color("#292323");
      else if (point.y < 0.115) color = boots;
      else if (point.y < 0.47) color = shirt;
      else if (point.y > 0.77 && point.y < 1.02) color = shorts;
      else if (point.y >= 1.02 && point.y < 1.53 && Math.abs(point.x) < 0.49)
        color = shirt;
      colors.set([color.r, color.g, color.b], i * 3);
    }
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    mesh.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.76,
      metalness: 0,
    });
  });
  // Hair and shirt numbers are attached to bones, so they follow the animation.
  const head = bones.get("Head");
  if (head) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.104,
        16,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.54,
      ),
      new THREE.MeshStandardMaterial({
        color: index % 5 === 0 ? "#684d34" : "#211e22",
        roughness: 0.95,
      }),
    );
    hair.position.set(0, 1.755, -0.005);
    hair.scale.set(1, 0.88, 0.96);
    root.add(hair);
    head.attach(hair);
    hair.castShadow = true;
  }
  const chest = bones.get("spine_03");
  if (chest) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = team ? "#fff9e9" : "#ffffff";
      context.textAlign = "center";
      context.font = "800 92px system-ui";
      context.fillText(String((index % 11) + 1), 64, 101);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.15,
      roughness: 0.9,
    });
    for (const side of [-1, 1]) {
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.22),
        material,
      );
      decal.position.set(0, 1.34, side * 0.151);
      decal.rotation.y = side === 1 ? 0 : Math.PI;
      root.add(decal);
      chest.attach(decal);
    }
  }
  const mixer = new THREE.AnimationMixer(body);
  const actions = ["Idle", "Walk", "Jog", "Sprint"].map((name) => {
    const clip = THREE.AnimationClip.findByName(template.animations, name);
    if (!clip) throw new Error(`Missing football animation: ${name}`);
    return mixer
      .clipAction(clip)
      .play()
      .setEffectiveWeight(name === "Idle" ? 1 : 0);
  });
  mixer.update(0.00001);
  body.updateWorldMatrix(true, true);
  body.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.computeBoundingSphere();
    // Conservative bounds include the full kick/celebration envelope. They allow
    // off-screen players to be culled without recalculating every skinned vertex.
    if (mesh.boundingSphere) mesh.boundingSphere.radius *= 2.4;
  });
  const cleanPose = [...bones.values()].map((bone) => ({
    bone,
    rotation: bone.quaternion.clone(),
  }));
  const weights = [1, 0, 0, 0];
  let heading = team ? -Math.PI / 2 : Math.PI / 2;
  let idleClock = 0;
  const axis = new THREE.Vector3(),
    parentRotation = new THREE.Quaternion(),
    delta = new THREE.Quaternion();
  const rotate = (name: string, angle: number, direction: "x" | "z" = "x") => {
    const bone = bones.get(name);
    if (!bone?.parent) return;
    bone.parent.updateWorldMatrix(true, false);
    root.getWorldQuaternion(parentRotation);
    axis
      .set(direction === "x" ? 1 : 0, 0, direction === "z" ? 1 : 0)
      .applyQuaternion(parentRotation);
    bone.parent.getWorldQuaternion(parentRotation).invert();
    axis.applyQuaternion(parentRotation);
    delta.setFromAxisAngle(axis, angle);
    bone.quaternion.premultiply(delta);
  };
  return {
    root,
    pose() {
      return ["thigh_l", "thigh_r", "calf_r", "upperarm_l"]
        .map((name) =>
          bones
            .get(name)
            ?.quaternion.toArray()
            .map((n) => n.toFixed(4))
            .join(","),
        )
        .join(";");
    },
    update(
      player: Athlete,
      ownsBall: boolean,
      dt: number,
      charge: number,
      celebrate: boolean,
    ) {
      root.visible = !player.inactive;
      if (player.inactive) return;
      const speed = Math.hypot(player.vx, player.vz);
      const target =
        speed < 0.15
          ? [1, 0, 0, 0]
          : speed < 2
            ? [1 - speed / 2, speed / 2, 0, 0]
            : speed < 5
              ? [0, (5 - speed) / 3, (speed - 2) / 3, 0]
              : [
                  0,
                  0,
                  Math.max(0, (8.5 - speed) / 3.5),
                  Math.min(1, (speed - 5) / 3.5),
                ];
      const response = 1 - Math.exp(-14 * dt);
      idleClock += dt;
      const stridePhase = ((player.gait ?? 0) / (Math.PI * 2)) % 1;
      actions.forEach((action, i) => {
        weights[i] += (target[i] - weights[i]) * response;
        action.setEffectiveWeight(weights[i]);
        // All locomotion clips share one travelled-distance phase. Blending
        // walk/jog/sprint must not blend opposite feet or run while stationary.
        action.time = i === 0 ? idleClock % action.getClip().duration : stridePhase * action.getClip().duration;
      });
      // Mixer bindings skip identical values. Restore the clean animation pose first,
      // otherwise procedural kick/shield offsets could accumulate on constant tracks.
      cleanPose.forEach(({ bone, rotation }) => bone.quaternion.copy(rotation));
      mixer.update(0);
      cleanPose.forEach(({ bone, rotation }) => rotation.copy(bone.quaternion));
      root.position.set(player.x, 0.012, player.z);
      const turn = Math.atan2(
        Math.sin(player.facing - heading),
        Math.cos(player.facing - heading),
      );
      heading += turn * (1 - Math.exp(-14 * dt));
      root.rotation.set(0, heading, 0);
      if (player.kick > 0) {
        const contact = Math.pow(player.kick / 0.4, 0.7);
        rotate("thigh_r", -contact * 0.95);
        rotate("calf_r", contact * 0.3);
        rotate("spine_02", contact * 0.08);
        rotate("upperarm_l", -contact * 0.25);
      } else if (ownsBall && charge > 0) {
        rotate("thigh_r", charge * 0.35);
        rotate("calf_r", charge * 0.7);
      } else if (
        ownsBall &&
        speed < 6 &&
        player.touchClock &&
        player.touchClock > 0.18
      ) {
        const touch =
          Math.sin(Math.min(1, player.touchClock / 0.4) * Math.PI) * 0.2;
        rotate("foot_r", -touch);
      }
      if ((player.receiving ?? 0) > 0)
        rotate("calf_r", (player.receiving ?? 0) * 0.6);
      if (player.shielding) {
        rotate("upperarm_l", -0.6, "z");
        rotate("spine_02", 0.13);
        root.rotation.z = -0.08;
      }
      if (player.skill > 0) {
        const lean = Math.sin((1 - player.skill / 0.75) * Math.PI * 2) * 0.22;
        root.rotation.z = lean;
        rotate("spine_02", -lean * 0.7, "z");
      }
      if (player.keeper) {
        rotate("upperarm_l", -0.22, "z");
        rotate("upperarm_r", 0.22, "z");
        if ((player.save ?? 0) > 0) {
          const gather = Math.sin(Math.min(1, (player.save ?? 0) / 0.65) * Math.PI);
          rotate("upperarm_l", -gather * 0.8);
          rotate("upperarm_r", -gather * 0.8);
          rotate("spine_02", gather * 0.17);
        }
      }
      if (celebrate) {
        rotate("upperarm_l", -2.1, "z");
        rotate("upperarm_r", 2.1, "z");
      }
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(body);
    },
  };
}
