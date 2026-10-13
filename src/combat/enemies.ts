import {
  overlaps,
  clamp,
  type Enemy,
  type Player,
  type Shot,
  type Rect,
} from "../core/types.ts";
export type CombatEvent = {
  type: "hit" | "hurt" | "parry" | "kill" | "telegraph" | "boss-defeat";
  x: number;
  y: number;
  kind?: string;
};
export function makeEnemy(
  kind: Enemy["kind"],
  x: number,
  y: number,
  id: string,
): Enemy {
  const boss = kind === "boss";
  const maxHp = boss ? 48 : kind === "sentinel" ? 5 : 3;
  return {
    id,
    kind,
    x,
    y,
    w: boss ? 144 : kind === "moth" ? 54 : 48,
    h: boss ? 240 : kind === "sentinel" ? 90 : 60,
    hp: maxHp,
    maxHp,
    vx: 0,
    vy: 0,
    home: x,
    dir: -1,
    timer: boss ? 2 : 1,
    state: "idle",
    age: 0,
    hurt: 0,
    phase: 1,
    pattern: 0,
    hitPlayer: false,
  };
}
export function hurtPlayer(
  p: Player,
  damage: number,
  sourceX: number,
  assist: boolean,
): boolean {
  if (p.invuln > 0 || p.dash > 0 || p.parry > 0) return false;
  p.hp = Math.max(0, p.hp - (assist ? 0.5 : damage));
  p.invuln = 1.3;
  p.vx = (p.x < sourceX ? -1 : 1) * 370;
  p.vy = -280;
  p.heal = 0;
  return true;
}
export function attackBox(p: Player, down: boolean, up: boolean): Rect {
  return down && !p.grounded
    ? { x: p.x - 22, y: p.y + p.h - 5, w: p.w + 44, h: 78 }
    : up
      ? { x: p.x - 35, y: p.y - 85, w: 105, h: 110 }
      : {
          x: p.dir > 0 ? p.x + p.w - 6 : p.x - 112,
          y: p.y - 18,
          w: 118,
          h: 110,
        };
}
export function strike(
  p: Player,
  enemies: Enemy[],
  box: Rect,
  damage: number,
  pogo: boolean,
): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (const e of enemies) {
    if (e.hp <= 0 || p.hitIds.has(e.id) || !overlaps(box, e)) continue;
    p.hitIds.add(e.id);
    e.hp = Math.max(0, e.hp - damage);
    e.hurt = 0.18;
    p.energy = clamp(p.energy + 12, 0, p.maxEnergy);
    if (e.kind !== "boss") e.x += p.dir * 14;
    if (pogo) p.vy = -570;
    events.push({ type: "hit", x: e.x + e.w / 2, y: e.y + e.h / 2 });
    if (e.hp === 0) {
      e.state = "dead";
      e.timer = 0.7;
      events.push({
        type: e.kind === "boss" ? "boss-defeat" : "kill",
        x: e.x,
        y: e.y,
        kind: e.kind,
      });
    }
  }
  return events;
}
export function updateEnemies(
  enemies: Enemy[],
  p: Player,
  dt: number,
  shots: Shot[],
  assist: boolean,
): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (const e of enemies) {
    e.age += dt;
    e.hurt = Math.max(0, e.hurt - dt);
    e.timer -= dt;
    if (e.hp <= 0) continue;
    const distance = Math.abs(p.x + p.w / 2 - (e.x + e.w / 2));
    e.dir = p.x < e.x ? -1 : 1;
    const emit = (type: CombatEvent["type"]) =>
      events.push({ type, x: e.x + e.w / 2, y: e.y + e.h / 2, kind: e.kind });
    if (e.kind === "moth") {
      e.y += Math.sin(e.age * 2.1) * dt * 27;
      if (e.state === "idle") {
        e.x += Math.sin(e.age * 0.9) * dt * 24;
        if (distance < 650 && e.timer <= 0) {
          e.state = "windup";
          e.timer = 0.65;
          emit("telegraph");
        }
      } else if (e.state === "windup" && e.timer <= 0) {
        const dx = p.x - e.x,
          dy = p.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        shots.push({
          x: e.x + 25,
          y: e.y + 25,
          w: 18,
          h: 18,
          vx: (dx / len) * 240,
          vy: (dy / len) * 240,
          life: 5,
          friendly: false,
          type: "orb",
          damage: 1,
        });
        e.state = "idle";
        e.timer = 2.8;
      }
    } else if (e.kind === "boss") {
      e.phase = e.hp <= e.maxHp * 0.3 ? 3 : e.hp <= e.maxHp * 0.65 ? 2 : 1;
      if (e.state === "idle") {
        if (distance > 220) e.x += e.dir * 70 * dt;
        e.x = clamp(e.x, 190, 1610);
        if (e.timer <= 0) {
          e.state = "windup";
          e.timer = e.phase === 3 ? 0.62 : 0.95;
          e.hitPlayer = false;
          e.pattern = (e.pattern + 1) % 4;
          emit("telegraph");
        }
      } else if (e.state === "windup" && e.timer <= 0) {
        e.state = "attack";
        e.timer = 0.45;
        const ground = 730;
        if (e.pattern === 0 || e.pattern === 2) {
          for (const dir of [-1, 1])
            shots.push({
              x: e.x + e.w / 2,
              y: ground - 36,
              w: 46,
              h: 36,
              vx: dir * (e.phase === 3 ? 400 : 300),
              vy: 0,
              life: 6,
              friendly: false,
              type: "wave",
              damage: 1,
            });
        }
        if (e.pattern === 2 && e.phase >= 2) {
          for (let i = 0; i < 3; i++)
            shots.push({
              x: p.x + (i - 1) * 160,
              y: 160,
              w: 24,
              h: 30,
              vx: 0,
              vy: 290,
              life: 3,
              friendly: false,
              type: "orb",
              damage: 1,
            });
        }
        if (e.pattern === 3) {
          for (const dir of [-1, 1])
            shots.push({
              x: e.x + 65,
              y: 480,
              w: 28,
              h: 28,
              vx: dir * 250,
              vy: 0,
              life: 6,
              friendly: false,
              type: "orb",
              damage: 1,
            });
        }
        emit("telegraph");
      } else if (e.state === "attack") {
        const box: Rect = {
          x: e.dir > 0 ? e.x + 60 : e.x - 155,
          y: 540,
          w: 240,
          h: 190,
        };
        if (overlaps(p, box) && !e.hitPlayer) {
          e.hitPlayer = true;
          if (p.parry > 0) {
            e.state = "recover";
            e.timer = 1.9;
            e.hp = Math.max(1, e.hp - 2);
            p.energy = clamp(p.energy + 20, 0, p.maxEnergy);
            emit("parry");
          } else if (hurtPlayer(p, 1, e.x, assist))
            events.push({ type: "hurt", x: p.x, y: p.y });
        }
        if (e.timer <= 0) {
          e.state = "recover";
          e.timer = e.phase === 3 ? 0.8 : 1.25;
        }
      } else if (e.state === "recover" && e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase === 3 ? 0.45 : 0.85;
      }
    } else {
      if (e.state === "idle") {
        const speed = e.kind === "sentinel" ? 55 : 32;
        if (distance < 370) e.x += e.dir * speed * dt;
        else e.x = e.home + Math.sin(e.age * 0.6) * 55;
        e.x = clamp(e.x, e.home - 160, e.home + 160);
        if (distance < 130 && e.timer <= 0) {
          e.state = "windup";
          e.timer = e.kind === "sentinel" ? 0.7 : 0.85;
          e.hitPlayer = false;
          emit("telegraph");
        }
      } else if (e.state === "windup" && e.timer <= 0) {
        e.state = "attack";
        e.timer = 0.23;
        if (e.kind === "sentinel") e.x += e.dir * 45;
      } else if (e.state === "attack") {
        const box = {
          x: e.dir > 0 ? e.x : e.x - 65,
          y: e.y - 10,
          w: e.w + 70,
          h: e.h + 20,
        };
        if (overlaps(p, box) && !e.hitPlayer) {
          e.hitPlayer = true;
          if (p.parry > 0) {
            e.state = "recover";
            e.timer = 1.6;
            e.hurt = 0.3;
            p.energy = clamp(p.energy + 20, 0, p.maxEnergy);
            emit("parry");
          } else if (hurtPlayer(p, 1, e.x, assist))
            events.push({ type: "hurt", x: p.x, y: p.y });
        }
        if (e.timer <= 0) {
          e.state = "recover";
          e.timer = 1;
        }
      } else if (e.state === "recover" && e.timer <= 0) {
        e.state = "idle";
        e.timer = 0.6;
      }
    }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (!s.friendly && overlaps(s, p)) {
      if (p.parry > 0) {
        s.friendly = true;
        s.vx = -(s.vx || 220);
        s.vy = -s.vy;
        p.energy = clamp(p.energy + 10, 0, p.maxEnergy);
        events.push({ type: "parry", x: p.x, y: p.y });
      } else if (p.dash <= 0) {
        if (hurtPlayer(p, s.damage, s.x, assist))
          events.push({ type: "hurt", x: p.x, y: p.y });
        s.life = 0;
      }
    }
    if (s.friendly)
      for (const e of enemies) {
        if (e.hp > 0 && overlaps(s, e)) {
          e.hp = Math.max(0, e.hp - 3);
          e.hurt = 0.2;
          s.life = 0;
          events.push({ type: "hit", x: e.x, y: e.y });
          if (!e.hp) {
            e.state = "dead";
            e.timer = 0.7;
            events.push({
              type: e.kind === "boss" ? "boss-defeat" : "kill",
              x: e.x,
              y: e.y,
              kind: e.kind,
            });
          }
        }
      }
    if (s.life <= 0 || s.x < 0 || s.x > 1920 || s.y > 900) shots.splice(i, 1);
  }
  return events;
}
