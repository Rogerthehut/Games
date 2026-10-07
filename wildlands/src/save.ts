/** Cartridge save format: versioned JSON with a checksum, downloaded/uploaded as a file. */

export const SAVE_VERSION = 1;

export interface SaveData {
  seed: number;
  timeOfDay: number; // 0..24
  player: { x: number; y: number; z: number; yaw: number; stamina: number };
  // Future systems add their own serialisable sections here and bump the version.
}

interface SaveFile {
  game: "wildlands";
  version: number;
  savedAt: string;
  checksum: string;
  data: SaveData;
}

function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function serialize(data: SaveData, now = new Date()): string {
  const file: SaveFile = {
    game: "wildlands",
    version: SAVE_VERSION,
    savedAt: now.toISOString(),
    checksum: checksum(JSON.stringify(data)),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export function deserialize(text: string): SaveData {
  let file: SaveFile;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error("That cartridge isn't readable (not valid JSON).");
  }
  if (file?.game !== "wildlands") throw new Error("That isn't a Wildlands cartridge.");
  if (file.version > SAVE_VERSION) throw new Error("This cartridge is from a newer version of the game.");
  if (file.checksum !== checksum(JSON.stringify(file.data))) {
    throw new Error("Cartridge is corrupted or has been modified.");
  }
  return migrate(file.data, file.version);
}

function migrate(data: SaveData, _from: number): SaveData {
  return data; // add per-version upgrade steps here as the format evolves
}

export function downloadSave(data: SaveData): void {
  const blob = new Blob([serialize(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wildlands-save.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
