import { describe, expect, it } from "vitest";
import { deserialize, serialize, type SaveData } from "./save";
import { heightAt } from "./world";

const sample: SaveData = { seed: 42, timeOfDay: 9.5, player: { x: 1, y: 2, z: 3, yaw: 0.5, stamina: 0.8 } };

describe("save", () => {
  it("round-trips", () => expect(deserialize(serialize(sample))).toEqual(sample));
  it("rejects tampering", () => {
    const t = serialize(sample).replace('"x": 1', '"x": 999');
    expect(() => deserialize(t)).toThrow(/corrupted/);
  });
  it("rejects junk", () => expect(() => deserialize("nope")).toThrow());
});

describe("world", () => {
  it("is deterministic per seed", () => {
    expect(heightAt(10, 20, 1)).toBe(heightAt(10, 20, 1));
    expect(heightAt(10, 20, 1)).not.toBe(heightAt(10, 20, 2));
  });
});
