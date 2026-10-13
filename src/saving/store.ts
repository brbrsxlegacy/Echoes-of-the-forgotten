import type { SaveData, Settings } from "../core/types.ts";
import { rooms } from "../world/rooms.ts";
export const defaultSettings: Settings = {
  music: 0.55,
  sfx: 0.7,
  shake: true,
  flashes: true,
  contrast: false,
  assist: false,
  quality: "auto",
  touchScale: 1,
  touchHeight: 20,
  bindings: {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    down: "KeyS",
    jump: "Space",
    attack: "KeyJ",
    parry: "KeyK",
    dash: "ShiftLeft",
    ability: "KeyL",
    interact: "KeyE",
    heal: "KeyH",
    map: "KeyM",
    inventory: "KeyI",
    pause: "Escape",
  },
};
export function newSave(): SaveData {
  return {
    version: 2,
    room: "lantern",
    checkpoint: { room: "lantern", x: 200, y: 630 },
    health: 6,
    maxHealth: 6,
    maxEnergy: 100,
    currency: 0,
    dash: false,
    bossDefeated: false,
    puzzleSolved: false,
    discovered: ["lantern"],
    collected: [],
    npc: 0,
    timestamp: Date.now(),
    playTime: 0,
  };
}
export function validateSave(value: unknown): SaveData | null {
  if (!value || typeof value !== "object") return null;
  const v = value as SaveData;
  if (
    v.version !== 2 ||
    !rooms[v.room] ||
    !v.checkpoint ||
    !rooms[v.checkpoint.room] ||
    !Number.isFinite(v.checkpoint.x) ||
    !Number.isFinite(v.checkpoint.y) ||
    v.checkpoint.x < 0 ||
    v.checkpoint.x > 1920 ||
    v.checkpoint.y < 0 ||
    v.checkpoint.y > 900
  )
    return null;
  if (
    !Number.isFinite(v.maxHealth) ||
    v.maxHealth < 6 ||
    v.maxHealth > 12 ||
    !Number.isFinite(v.maxEnergy) ||
    v.maxEnergy < 100 ||
    v.maxEnergy > 200 ||
    !Number.isFinite(v.health) ||
    v.health < 0 ||
    v.health > v.maxHealth ||
    !Number.isFinite(v.currency) ||
    v.currency < 0 ||
    v.currency > 100000
  )
    return null;
  if (
    !Array.isArray(v.discovered) ||
    !v.discovered.every((x) => typeof x === "string" && !!rooms[x]) ||
    !Array.isArray(v.collected) ||
    !v.collected.every((x) => typeof x === "string") ||
    v.collected.length > 100
  )
    return null;
  if (
    typeof v.dash !== "boolean" ||
    typeof v.bossDefeated !== "boolean" ||
    typeof v.puzzleSolved !== "boolean" ||
    !Number.isFinite(v.npc) ||
    !Number.isFinite(v.timestamp) ||
    !Number.isFinite(v.playTime)
  )
    return null;
  return structuredClone(v);
}
export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
export class SaveStore {
  constructor(private storage: StorageLike) {}
  load(slot: number): SaveData | null {
    try {
      const raw = this.storage.getItem(`echoes-v2-slot-${slot}`);
      return raw ? validateSave(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }
  save(slot: number, data: SaveData): boolean {
    try {
      const safe = validateSave(data);
      if (!safe) return false;
      safe.timestamp = Date.now();
      this.storage.setItem(`echoes-v2-slot-${slot}`, JSON.stringify(safe));
      return true;
    } catch {
      return false;
    }
  }
  settings(): Settings {
    try {
      const v = JSON.parse(this.storage.getItem("echoes-settings") || "{}");
      return {
        ...defaultSettings,
        ...v,
        music: Math.max(0, Math.min(1, Number(v.music ?? 0.55))),
        sfx: Math.max(0, Math.min(1, Number(v.sfx ?? 0.7))),
        touchScale: Math.max(0.75, Math.min(1.4, Number(v.touchScale ?? 1))),
        bindings: { ...defaultSettings.bindings, ...v.bindings },
      };
    } catch {
      return structuredClone(defaultSettings);
    }
  }
  setSettings(settings: Settings): void {
    try {
      this.storage.setItem("echoes-settings", JSON.stringify(settings));
    } catch {}
  }
}
