import type { SaveData, EnemyKind } from "../core/types.ts";
import { questItems } from "../world/regions.ts";
export function awardBoss(data: SaveData, kind: EnemyKind) {
  const key = kind === "boss" ? "bellkeeper" : kind;
  if (data.bosses.includes(key)) return false;
  data.bosses.push(key);
  data.currency += 100;
  if (kind === "boss") {
    data.bossDefeated = true;
    data.dash = true;
  }
  if (kind === "cantor") data.tide = true;
  if (kind === "ashknight") data.ember = true;
  return true;
}
export function returnFragments(data: SaveData, npc: "mira" | "wren") {
  const count = questItems[npc].filter((x) =>
    data.collected.includes(x),
  ).length;
  const complete = count === 3 && !data.quests.includes(npc);
  if (complete) {
    data.quests.push(npc);
    data.currency += 75;
    if (npc === "mira") data.maxHealth = Math.min(20, data.maxHealth + 1);
    else if (!data.relics.includes("aegis")) data.relics.push("aegis");
  }
  return { count, complete, returned: data.quests.includes(npc) };
}
