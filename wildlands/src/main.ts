import * as THREE from "three";
import { colourAt, heightAt, SEA_LEVEL, WORLD_SIZE } from "./world";
import { deserialize, downloadSave, serialize, type SaveData } from "./save";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1500);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x445533, 0.8);
scene.add(sun, hemi);

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x3b6fd1, flatShading: true }),
);
scene.add(player);

let seed = 1337;
let terrain: THREE.Mesh | undefined;
let water: THREE.Mesh | undefined;
let timeOfDay = 10;
let yaw = 0, pitch = 0.35, facing = 0;
let vy = 0, grounded = false, stamina = 1, running = false;
const keys = new Set<string>();

function buildWorld(newSeed: number) {
  seed = newSeed;
  if (terrain) { terrain.geometry.dispose(); scene.remove(terrain); }
  const seg = 256;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i), seed));
  geo.computeVertexNormals();
  const colours = new Float32Array(pos.count * 3);
  const n = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const [r, g, b] = colourAt(pos.getY(i), 1 - n.getY(i));
    colours.set([r, g, b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
  scene.add(terrain);
  if (!water) {
    water = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2f6fa8, transparent: true, opacity: 0.8 }),
    );
    water.position.y = SEA_LEVEL;
    scene.add(water);
  }
}

function spawn() {
  // Find dry land near the middle.
  for (let r = 0; r < 200; r += 4) {
    for (let a = 0; a < 6.28; a += 0.5) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (heightAt(x, z, seed) > 3) { player.position.set(x, heightAt(x, z, seed) + 1, z); return; }
    }
  }
  player.position.set(0, 20, 0);
}

function toast(msg: string) {
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 2500);
}

function snapshot(): SaveData {
  const p = player.position;
  return { seed, timeOfDay, player: { x: p.x, y: p.y, z: p.z, yaw, stamina } };
}

function applySave(s: SaveData) {
  buildWorld(s.seed);
  timeOfDay = s.timeOfDay;
  player.position.set(s.player.x, s.player.y, s.player.z);
  yaw = s.player.yaw;
  stamina = s.player.stamina;
  vy = 0;
}

let started = false;
function start() {
  $("title").style.display = "none";
  started = true;
  renderer.domElement.requestPointerLock?.();
}

$("btn-new").onclick = () => { buildWorld(Math.floor(Math.random() * 1e9)); spawn(); start(); };
$("btn-load").onclick = () => { $("loadbox").hidden = false; };
$("load-file").onclick = () => $<HTMLInputElement>("file").click();
$("load-close").onclick = () => { $("loadbox").hidden = true; };
function loadText(text: string) {
  try { applySave(deserialize(text)); $("loadbox").hidden = true; start(); toast("Cartridge loaded"); }
  catch (e) { toast((e as Error).message); }
}
$("load-go").onclick = () => loadText($<HTMLTextAreaElement>("load-text").value.trim());
async function loadFile(f: File) { loadText(await f.text()); }

function openSave() {
  const text = serialize(snapshot());
  $<HTMLTextAreaElement>("save-text").value = text;
  $("savebox").hidden = false;
  keys.clear();
  document.exitPointerLock?.();
}
$("save-close").onclick = () => { $("savebox").hidden = true; renderer.domElement.requestPointerLock?.(); };
$("save-dl").onclick = () => downloadSave(snapshot());
$("save-copy").onclick = async () => {
  const ta = $<HTMLTextAreaElement>("save-text");
  try { await navigator.clipboard.writeText(ta.value); toast("Copied"); }
  catch { ta.select(); toast("Press Ctrl+C to copy"); }
};
$<HTMLInputElement>("file").onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) loadFile(f); };
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) loadFile(f); });

const modalOpen = () => !$("savebox").hidden || !$("loadbox").hidden;
addEventListener("keydown", (e) => {
  if (modalOpen()) return;
  keys.add(e.code);
  if (e.code === "KeyP" && started) openSave();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0025;
  pitch = Math.max(-0.3, Math.min(1.3, pitch + e.movementY * 0.0025));
});
renderer.domElement.addEventListener("click", () => started && renderer.domElement.requestPointerLock?.());

const WALK = 5, RUN = 9, GRAVITY = 24, JUMP = 8.5, MAX_SLOPE = 0.9;

function update(dt: number) {
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
  const s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const moving = f !== 0 || s !== 0;
  running = moving && keys.has("ShiftLeft") && stamina > 0.02;
  stamina = Math.min(1, Math.max(0, stamina + (running ? -0.2 : 0.3) * dt));

  if (moving) {
    const len = Math.hypot(f, s);
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const dx = (-sin * f + cos * s) / len, dz = (-cos * f - sin * s) / len;
    const speed = running ? RUN : WALK;
    const p = player.position;
    const nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
    const half = WORLD_SIZE / 2 - 2;
    // Slope limit: refuse steps that climb too steeply.
    const rise = heightAt(nx, nz, seed) - heightAt(p.x, p.z, seed);
    if (rise / (speed * dt) < MAX_SLOPE && Math.abs(nx) < half && Math.abs(nz) < half) { p.x = nx; p.z = nz; }
    facing = Math.atan2(dx, dz);
  }
  player.rotation.y = facing;

  if (grounded && keys.has("Space")) { vy = JUMP; grounded = false; }
  vy -= GRAVITY * dt;
  player.position.y += vy * dt;
  const ground = heightAt(player.position.x, player.position.z, seed) + 0.9;
  if (player.position.y <= ground) { player.position.y = ground; vy = 0; grounded = true; } else grounded = false;

  // Day/night: 1 in-game day = 10 real minutes.
  timeOfDay = (timeOfDay + dt * (24 / 600)) % 24;
  const a = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const day = Math.max(0, Math.sin(a));
  sun.position.set(Math.cos(a) * 200, Math.sin(a) * 200, 80).add(player.position);
  sun.target.position.copy(player.position);
  sun.intensity = 0.15 + 2.2 * day;
  hemi.intensity = 0.15 + 0.8 * day;
  const sky = new THREE.Color(0x0a1230).lerp(new THREE.Color(0x8fc4ff), day);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 150, 700);

  // Third-person camera.
  const dist = 7;
  const cp = player.position;
  camera.position.set(
    cp.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    cp.y + 1.2 + Math.sin(pitch) * dist,
    cp.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  const minY = heightAt(camera.position.x, camera.position.z, seed) + 1;
  if (camera.position.y < minY) camera.position.y = minY;
  camera.lookAt(cp.x, cp.y + 1, cp.z);

  const hh = Math.floor(timeOfDay), mm = Math.floor((timeOfDay % 1) * 60);
  $("hud").textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}\nWASD move · Shift run · Space jump · P save cartridge`;
  ($("hud-stamina").firstElementChild as HTMLElement).style.width = `${stamina * 100}%`;
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (started) update(dt);
  renderer.render(scene, camera);
});

buildWorld(seed);
camera.position.set(0, 120, 200);
camera.lookAt(0, 0, 0);
