import {
  clamp,
  overlaps,
  type Enemy,
  type Player,
  type Shot,
  type Rect,
} from "../core/types.ts";
import { hurtPlayer, type CombatEvent } from "./enemies.ts";
/** Committed aim during windup, visible attack markers, and exploitable recovery. */
export function updateRegionBoss(
  e: Enemy,
  p: Player,
  dt: number,
  shots: Shot[],
  assist: boolean,
  defence: number,
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const emit = (type: CombatEvent["type"]) =>
    events.push({ type, x: e.x + e.w / 2, y: e.y + e.h / 2, kind: e.kind });
  e.phase = e.hp <= e.maxHp * 0.3 ? 3 : e.hp <= e.maxHp * 0.65 ? 2 : 1;
  if (e.state === "idle") {
    if (Math.abs(p.x - e.x) > 210)
      e.x += e.dir * (e.kind === "cantor" ? 45 : 80) * dt;
    e.x = clamp(e.x, 220, 1550);
    if (e.timer <= 0) {
      e.state = "windup";
      e.pattern = (e.pattern + 1) % 4;
      e.timer = e.phase === 3 ? 0.72 : 1.0;
      e.targetX = p.x + 17;
      e.attackDir = e.dir;
      e.hitPlayer = false;
      emit("telegraph");
    }
  } else if (e.state === "windup" && e.timer <= 0) {
    e.state = "attack";
    e.timer = e.pattern === 1 ? 0.42 : 0.35;
    const push = (
      x: number,
      y: number,
      w: number,
      h: number,
      vx: number,
      vy: number,
      type: Shot["type"] = "orb",
    ) =>
      shots.push({
        x,
        y,
        w,
        h,
        vx,
        vy,
        life: type === "flame" ? 1.5 : 5,
        friendly: false,
        type,
        damage: 1,
      });
    if (e.kind === "cantor") {
      if (e.pattern === 0)
        for (const d of [-1, 1])
          push(e.x + 65, 690, 46, 36, d * (260 + e.phase * 30), 0, "wave");
      if (e.pattern === 2)
        for (let i = 0; i < (e.phase >= 2 ? 5 : 3); i++)
          push(
            e.targetX + (i - (e.phase >= 2 ? 2 : 1)) * 125,
            150,
            24,
            32,
            0,
            300,
          );
      if (e.pattern === 3) {
        for (let i = -2; i <= 2; i++)
          push(
            e.x + 65,
            570,
            23,
            23,
            e.attackDir * (210 + e.phase * 15),
            i * 85,
          );
      }
    } else {
      if (e.pattern === 0)
        for (const d of [-1, 1])
          push(e.x + 70, 689, 46, 40, d * (290 + e.phase * 30), 0, "wave");
      if (e.pattern === 2)
        for (let i = 0; i < (e.phase >= 2 ? 3 : 1); i++)
          push(
            e.targetX - 25 + (i - (e.phase >= 2 ? 1 : 0)) * 150,
            575,
            50,
            155,
            0,
            0,
            "flame",
          );
      if (e.pattern === 3)
        for (const d of [-1, 1]) push(e.x + 70, 550, 28, 28, d * 290, 80);
    }
  } else if (e.state === "attack") {
    if (e.kind === "ashknight" && e.pattern === 1)
      e.x = clamp(e.x + e.attackDir * 620 * dt, 180, 1630);
    const box: Rect = {
      x: e.attackDir > 0 ? e.x + e.w - 40 : e.x - 150,
      y: e.y + 25,
      w: 190,
      h: e.h - 25,
    };
    if (
      (e.pattern === 1 || e.pattern === 0) &&
      overlaps(p, box) &&
      !e.hitPlayer
    ) {
      e.hitPlayer = true;
      if (p.parry > 0) {
        e.state = "recover";
        e.timer = 2;
        e.hp = Math.max(1, e.hp - 2);
        p.energy = clamp(p.energy + 20, 0, p.maxEnergy);
        emit("parry");
      } else if (hurtPlayer(p, defence, e.x, assist))
        events.push({ type: "hurt", x: p.x, y: p.y });
    }
    if (e.timer <= 0) {
      e.state = "recover";
      e.timer = e.phase === 3 ? 1.05 : 1.4;
    }
  } else if (e.state === "recover" && e.timer <= 0) {
    if (e.kind === "cantor" && e.pattern === 3) e.x = e.x > 960 ? 400 : 1400;
    e.state = "idle";
    e.timer = e.phase === 3 ? 0.55 : 0.85;
  }
  return events;
}
