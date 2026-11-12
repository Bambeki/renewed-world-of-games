/* eslint-disable @typescript-eslint/no-require-imports -- Validate bundled GLB and real skeletal animation. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
test("bundled humanoid has skin weights, a complete rig and four moving locomotion clips", async () => {
  const bytes = fs.readFileSync(
    path.join(__dirname, "../public/assets/football/player.glb"),
  );
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.ok(bytes.length < 1500000, "asset budget: 1.5 MB");
  const { GLTFLoader } =
    await import("three/examples/jsm/loaders/GLTFLoader.js");
  const THREE = await import("three");
  const model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  assert.deepEqual(model.animations.map((a) => a.name).sort(), [
    "Idle",
    "Jog",
    "Sprint",
    "Walk",
  ]);
  const skins = [];
  model.scene.traverse((o) => {
    if (o.isSkinnedMesh) skins.push(o);
  });
  assert.equal(skins.length, 3);
  assert.ok(
    skins.every(
      (o) => o.geometry.attributes.skinWeight && o.skeleton.bones.length >= 60,
    ),
  );
  const mixer = new THREE.AnimationMixer(model.scene);
  mixer.clipAction(model.animations.find((a) => a.name === "Jog")).play();
  const foot = model.scene.getObjectByName("foot_l"),
    before = new THREE.Vector3(),
    after = new THREE.Vector3();
  mixer.setTime(0);
  model.scene.updateMatrixWorld(true);
  foot.getWorldPosition(before);
  mixer.setTime(0.2);
  model.scene.updateMatrixWorld(true);
  foot.getWorldPosition(after);
  assert.ok(
    before.distanceTo(after) > 0.2,
    "jogging changes the actual foot bone position",
  );
  mixer.stopAllAction();
  mixer.uncacheRoot(model.scene);
});
