export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type EnemyKind = "moth" | "husk" | "sentinel" | "boss";
export interface Enemy extends Rect {
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  home: number;
  dir: number;
  timer: number;
  state: "idle" | "windup" | "attack" | "recover" | "dead";
  age: number;
  hurt: number;
  phase: number;
  pattern: number;
  hitPlayer: boolean;
}
export interface Platform extends Rect {
  kind?: "stone" | "wood" | "root" | "moving";
  originY?: number;
}
export interface Exit {
  side: "left" | "right" | "up" | "down";
  to: string;
  spawn: [number, number];
  gate?: "dash" | "puzzle";
  label?: string;
}
export interface Prop {
  kind:
    | "shrine"
    | "npc"
    | "bell"
    | "lore"
    | "upgrade"
    | "gate"
    | "flowers"
    | "arch";
  x: number;
  y: number;
  id?: string;
  text?: string;
  note?: number;
}
export interface Room {
  id: string;
  name: string;
  subtitle: string;
  map: [number, number];
  width: number;
  height: number;
  platforms: Platform[];
  hazards: Rect[];
  enemies: { kind: EnemyKind; x: number; y: number; id: string }[];
  props: Prop[];
  exits: Exit[];
  tone: number;
}
export interface Player extends Rect {
  vx: number;
  vy: number;
  dir: number;
  grounded: boolean;
  wall: number;
  coyote: number;
  buffer: number;
  jumpGrace: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  invuln: number;
  dash: number;
  dashCooldown: number;
  airDash: boolean;
  attack: number;
  combo: number;
  comboWindow: number;
  parry: number;
  parryCooldown: number;
  charging: number;
  anim: string;
  animTime: number;
  hitIds: Set<string>;
  safeX: number;
  safeY: number;
  heal: number;
}
export interface Shot extends Rect {
  vx: number;
  vy: number;
  life: number;
  friendly: boolean;
  type: "orb" | "wave";
  damage: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}
export interface SaveData {
  version: 2;
  room: string;
  checkpoint: { room: string; x: number; y: number };
  health: number;
  maxHealth: number;
  maxEnergy: number;
  currency: number;
  dash: boolean;
  bossDefeated: boolean;
  puzzleSolved: boolean;
  discovered: string[];
  collected: string[];
  npc: number;
  timestamp: number;
  playTime: number;
}
export interface Settings {
  music: number;
  sfx: number;
  shake: boolean;
  flashes: boolean;
  contrast: boolean;
  assist: boolean;
  quality: "auto" | "high" | "low";
  touchScale: number;
  touchHeight: number;
  bindings: Record<string, string>;
}
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const approach = (v: number, to: number, delta: number) =>
  v < to ? Math.min(to, v + delta) : Math.max(to, v - delta);
