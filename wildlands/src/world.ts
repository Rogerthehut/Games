import { fbm } from "./noise";

export const WORLD_SIZE = 512; // metres, square, centred on origin
export const SEA_LEVEL = 0;

/** Pure, seed-driven height function: the world is regenerated from the seed, never stored. */
export function heightAt(x: number, z: number, seed: number): number {
  const s = 1 / 180;
  const base = fbm(x * s, z * s, seed, 5);
  const ridges = Math.abs(fbm(x * s * 2 + 40, z * s * 2 + 40, seed + 7, 3) - 0.5) * 2;
  const island = 1 - Math.min(1, Math.hypot(x, z) / (WORLD_SIZE * 0.5)) ** 2.2;
  const h = (base * 55 + (1 - ridges) * 18) * island - 12;
  return h;
}

export function colourAt(h: number, slope: number): [number, number, number] {
  if (h < 1.5) return [0.85, 0.8, 0.55]; // sand
  if (slope > 0.55) return [0.45, 0.42, 0.4]; // rock
  if (h > 38) return [0.92, 0.94, 0.96]; // snow
  if (h > 24) return [0.4, 0.5, 0.3];
  return [0.3 + 0.1 * Math.min(1, h / 20), 0.58, 0.25];
}
