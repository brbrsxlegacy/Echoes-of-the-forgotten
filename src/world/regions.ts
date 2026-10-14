import type { Room, SaveData, Exit, EnemyKind } from "../core/types.ts";
export type RegionId = "grove" | "drowned" | "ashen";
export const regions = {
  grove: {
    name: "Fısıldayan Koru",
    english: "WHISPERING GROVE",
    color: "#d8c791",
    world: "world",
    atlas: "atlas",
    music: "grove" as const,
  },
  drowned: {
    name: "Batık Katedral",
    english: "DROWNED CATHEDRAL",
    color: "#a3dedc",
    world: "drownedWorld",
    atlas: "drownedAtlas",
    music: "drowned" as const,
  },
  ashen: {
    name: "Kül Çukuru",
    english: "ASHEN HOLLOW",
    color: "#ebad76",
    world: "ashenWorld",
    atlas: "ashenAtlas",
    music: "ashen" as const,
  },
};
export const regionOf = (room: Room): RegionId => room.region ?? "grove";
export const bossDefinitions = {
  boss: { name: "Çan Muhafızı", reward: "Rezonans Dash", region: "grove" },
  cantor: { name: "Batık Kantor", reward: "Gelgit Nefesi", region: "drowned" },
  ashknight: { name: "Kül Şövalyesi", reward: "Kor Muhafızı", region: "ashen" },
} as const;
export const isBoss = (
  kind: EnemyKind,
): kind is "boss" | "cantor" | "ashknight" =>
  kind === "boss" || kind === "cantor" || kind === "ashknight";
export function gateOpen(data: SaveData, gate: Exit["gate"]): boolean {
  switch (gate) {
    case "dash":
      return data.dash;
    case "puzzle":
      return data.puzzleSolved;
    case "tide":
      return data.tide;
    case "ember":
      return data.ember;
    case "sluice":
      return data.switches.sluice === 2;
    case "forge":
      return (
        data.switches["forge-a"] === 1 &&
        (data.switches["forge-b"] ?? 0) === 0 &&
        data.switches["forge-c"] === 2
      );
    default:
      return true;
  }
}
export const questItems = {
  mira: ["canticle-1", "canticle-2", "canticle-3"],
  wren: ["ember-1", "ember-2", "ember-3"],
};
export const relics = {
  keen: { name: "Keskin Ezgi", text: "Her yakın dövüş vuruşu +1 hasar." },
  aegis: { name: "Hatıra Zırhı", text: "Alınan savaş hasarı %25 azalır." },
  focus: {
    name: "Sakin Nota",
    text: "Echo Burst 30, iyileşme 30 rezonans harcar.",
  },
};
