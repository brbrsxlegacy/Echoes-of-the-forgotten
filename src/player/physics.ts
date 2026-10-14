import {
  approach,
  overlaps,
  clamp,
  type Player,
  type Platform,
} from "../core/types.ts";
import type { Input } from "../input/controls.ts";
export function makePlayer(
  x: number,
  y: number,
  hp = 6,
  maxHp = 6,
  maxEnergy = 100,
): Player {
  return {
    x,
    y,
    w: 34,
    h: 68,
    vx: 0,
    vy: 0,
    dir: 1,
    grounded: false,
    wall: 0,
    coyote: 0,
    buffer: 0,
    jumpGrace: 0,
    hp,
    maxHp,
    energy: maxEnergy,
    maxEnergy,
    invuln: 0,
    dash: 0,
    dashCooldown: 0,
    airDash: true,
    attack: 0,
    combo: 0,
    comboWindow: 0,
    parry: 0,
    parryCooldown: 0,
    charging: 0,
    anim: "idle",
    animTime: 0,
    hitIds: new Set(),
    safeX: x,
    safeY: y,
    heal: 0,
  };
}
export function movePlayer(
  p: Player,
  input: Pick<Input, "down" | "tap">,
  platforms: Platform[],
  dt: number,
  dashUnlocked: boolean,
  swimming = false,
): { jump: boolean; land: boolean; dash: boolean } {
  const out = { jump: false, land: false, dash: false };
  const wasGrounded = p.grounded;
  p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
  p.buffer = input.tap("jump") ? 0.14 : Math.max(0, p.buffer - dt);
  p.jumpGrace = Math.max(0, p.jumpGrace - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.parry = Math.max(0, p.parry - dt);
  p.parryCooldown = Math.max(0, p.parryCooldown - dt);
  p.attack = Math.max(0, p.attack - dt);
  p.comboWindow = Math.max(0, p.comboWindow - dt);
  if (!p.comboWindow) p.combo = 0;
  p.heal = Math.max(0, p.heal - dt);
  const axis = Number(input.down("right")) - Number(input.down("left"));
  if (axis) p.dir = axis;
  if (p.buffer > 0 && (p.coyote > 0 || p.wall)) {
    const wall = p.wall;
    p.vy = -760;
    p.jumpGrace = 0.12;
    p.vx = wall ? -wall * 470 : p.vx;
    p.buffer = 0;
    p.coyote = 0;
    p.grounded = false;
    p.wall = 0;
    out.jump = true;
  }
  if (
    input.tap("dash") &&
    dashUnlocked &&
    !p.dashCooldown &&
    (p.grounded || p.airDash)
  ) {
    p.dash = 0.19;
    p.dashCooldown = 0.5;
    p.vx = p.dir * 1350;
    p.vy = input.down("up") ? -550 : input.down("down") ? 450 : 0;
    p.airDash = false;
    out.dash = true;
  }
  if (p.dash > 0) {
    p.dash = Math.max(0, p.dash - dt);
  } else {
    p.vx = approach(
      p.vx,
      p.heal ? 0 : axis * 310,
      dt * (p.grounded ? 2400 : 1250),
    );
    if (swimming) {
      const vertical =
        Number(input.down("down")) -
        Number(input.down("up") || input.down("jump"));
      p.vy = approach(p.vy, vertical ? vertical * 250 : -25, dt * 1100);
      p.airDash = true;
    } else {
      if (p.vy < 0 && !input.down("jump") && p.jumpGrace <= 0)
        p.vy += 2300 * dt;
      p.vy = Math.min(1000, p.vy + (p.vy > 0 ? 2050 : 1650) * dt);
      if (p.wall && axis && p.vy > 125) p.vy = 125;
    }
  }
  p.x += p.vx * dt;
  p.wall = 0;
  for (const r of platforms) {
    if (overlaps(p, r)) {
      // Forgive a small near-top corner overlap instead of treating it as a wall.
      const lip = p.y + p.h - r.y;
      if (p.vy <= 0 && lip >= 0 && lip <= 8 && p.y < r.y) {
        p.y = r.y - p.h;
        p.vy = 0;
        continue;
      }
      if (p.vx > 0) {
        p.x = r.x - p.w;
        p.wall = 1;
      } else if (p.vx < 0) {
        p.x = r.x + r.w;
        p.wall = -1;
      }
      p.vx = 0;
    }
  }
  const oldBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const r of platforms) {
    if (overlaps(p, r)) {
      if (p.vy >= 0 && oldBottom <= r.y + 14) {
        p.y = r.y - p.h;
        p.vy = 0;
        p.grounded = true;
        p.airDash = true;
        if (r.kind === "moving") p.y = r.y - p.h;
      } else if (p.vy < 0) {
        p.y = r.y + r.h;
        p.vy = 0;
      }
    }
  }
  if (p.grounded) {
    if (!wasGrounded) {
      out.land = true;
    }
    if (p.x > 60 && p.x < 1860) {
      p.safeX = p.x;
      p.safeY = p.y;
    }
  }
  let anim = p.dash
    ? "dash"
    : p.heal
      ? "heal"
      : p.parry
        ? "parry"
        : p.attack
          ? "attack"
          : p.invuln > 0.9
            ? "hit"
            : !p.grounded
              ? p.wall && p.vy > 0
                ? "wall"
                : p.vy < 0
                  ? "jump"
                  : "fall"
              : Math.abs(p.vx) > 35
                ? "run"
                : "idle";
  if (out.land) anim = "land";
  if (p.anim !== anim) {
    p.anim = anim;
    p.animTime = 0;
  }
  p.animTime += dt;
  p.energy = clamp(p.energy, 0, p.maxEnergy);
  return out;
}
