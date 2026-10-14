import { test } from "node:test";
import assert from "node:assert/strict";
import { makePlayer, movePlayer } from "../src/player/physics.ts";
import {
  makeEnemy,
  strike,
  attackBox,
  updateEnemies,
  hurtPlayer,
} from "../src/combat/enemies.ts";
import { ringBell, rooms } from "../src/world/rooms.ts";
import { newSave, validateSave, SaveStore } from "../src/saving/store.ts";
import { Input } from "../src/input/controls.ts";
const idle = { down: () => false, tap: () => false };
const input = (held: string[] = [], tap: string[] = []) => ({
  down: (a: string) => held.includes(a),
  tap: (a: string) => tap.includes(a),
});
const floor = [{ x: 0, y: 730, w: 1920, h: 200 }];
test("ground collision and acceleration stop reliably", () => {
  const p = makePlayer(100, 600);
  for (let i = 0; i < 120; i++) movePlayer(p, idle, floor, 1 / 120, false);
  assert.equal(p.y, 662);
  assert.equal(p.grounded, true);
  for (let i = 0; i < 60; i++)
    movePlayer(p, input(["right"]), floor, 1 / 120, false);
  assert.equal(p.vx, 310);
  const x = p.x;
  for (let i = 0; i < 30; i++) movePlayer(p, idle, floor, 1 / 120, false);
  assert.equal(p.vx, 0);
  assert.ok(p.x > x);
});
test("variable jump: held jump reaches higher than released jump", () => {
  const simulate = (hold: boolean) => {
    const p = makePlayer(100, 662);
    p.grounded = true;
    let min = p.y;
    for (let i = 0; i < 110; i++) {
      movePlayer(
        p,
        input(hold ? ["jump"] : [], i === 0 ? ["jump"] : []),
        floor,
        1 / 120,
        false,
      );
      min = Math.min(min, p.y);
    }
    assert.equal(p.grounded, true);
    return min;
  };
  assert.ok(simulate(true) < simulate(false) - 45);
});
test("coyote time and buffered landing jump", () => {
  const p = makePlayer(100, 662);
  p.coyote = 0.07;
  movePlayer(p, input(["jump"], ["jump"]), [], 1 / 120, false);
  assert.ok(p.vy < 0);
  const q = makePlayer(100, 650);
  q.vy = 500;
  movePlayer(q, input([], ["jump"]), floor, 1 / 120, false);
  for (let i = 0; i < 5; i++)
    movePlayer(q, input(["jump"]), floor, 1 / 120, false);
  assert.ok(q.vy < 0);
});
test("wall slide and wall jump launch away from collision", () => {
  const p = makePlayer(110, 400);
  p.vx = 310;
  p.vy = 600;
  const wall = [{ x: 150, y: 0, w: 60, h: 730 }];
  for (let i = 0; i < 8; i++)
    movePlayer(p, input(["right"]), wall, 1 / 120, false);
  assert.equal(p.wall, 1);
  assert.ok(p.vy <= 143);
  movePlayer(p, input(["jump"], ["jump"]), wall, 1 / 120, false);
  assert.ok(p.vx < 0);
  assert.ok(p.vy < 0);
});
test("dash locked before boss; air dash once until landing", () => {
  const p = makePlayer(300, 400);
  movePlayer(p, input([], ["dash"]), [], 1 / 120, false);
  assert.equal(p.dash, 0);
  movePlayer(p, input([], ["dash"]), [], 1 / 120, true);
  assert.ok(p.dash > 0);
  assert.equal(p.airDash, false);
  p.dash = 0;
  p.dashCooldown = 0;
  movePlayer(p, input([], ["dash"]), [], 1 / 120, true);
  assert.equal(p.dash, 0);
  p.y = 662;
  p.vy = 20;
  movePlayer(p, idle, floor, 1 / 120, true);
  assert.equal(p.airDash, true);
});
test("melee damages once per swing; downward attack bounces", () => {
  const p = makePlayer(300, 600);
  const e = makeEnemy("husk", 350, 610, "enemy");
  const box = attackBox(p, false, false);
  assert.equal(strike(p, [e], box, 1, false).length, 1);
  assert.equal(e.hp, 2);
  strike(p, [e], box, 1, false);
  assert.equal(e.hp, 2);
  p.hitIds.clear();
  strike(p, [e], box, 1, true);
  assert.equal(p.vy, -570);
});
test("damage invulnerability and parry creates recovery", () => {
  const p = makePlayer(300, 662);
  assert.ok(hurtPlayer(p, 1, 340, false));
  assert.equal(p.hp, 5);
  assert.equal(hurtPlayer(p, 1, 340, false), false);
  p.invuln = 0;
  p.parry = 0.15;
  const e = makeEnemy("sentinel", 340, 640, "guardian");
  e.state = "attack";
  e.timer = 0.2;
  const events = updateEnemies([e], p, 1 / 120, [], false);
  assert.equal(p.hp, 5);
  assert.equal(e.state, "recover");
  assert.ok(events.some((e) => e.type === "parry"));
});
test("boss attacks through telegraph, changes phases and can be defeated", () => {
  const p = makePlayer(500, 662);
  const e = makeEnemy("boss", 900, 490, "boss");
  const shots = [];
  e.timer = 0;
  updateEnemies([e], p, 1 / 120, shots, false);
  assert.equal(e.state, "windup");
  for (let i = 0; i < 540; i++) updateEnemies([e], p, 1 / 120, shots, false);
  assert.ok(shots.length > 0);
  e.hp = 12;
  updateEnemies([e], p, 1 / 120, shots, false);
  assert.equal(e.phase, 3);
  p.hitIds.clear();
  const events = strike(p, [e], { x: 0, y: 0, w: 1920, h: 900 }, 20, false);
  assert.equal(e.hp, 0);
  assert.ok(events.some((e) => e.type === "boss-defeat"));
});
test("musical puzzle accepts I III II and rejects errors", () => {
  let p = [];
  for (const n of [0, 2, 1]) {
    const r = ringBell(p, n);
    p = r.progress;
    if (n === 1) assert.equal(r.solved, true);
  }
  assert.equal(ringBell([0], 1).solved, false);
  assert.deepEqual(ringBell([0], 1).progress, []);
});
test("all implemented room exits refer to real rooms and valid spawn locations", () => {
  for (const r of Object.values(rooms)) {
    assert.ok(r.platforms.length);
    assert.ok(r.exits.length);
    for (const e of r.exits) {
      assert.ok(rooms[e.to]);
      assert.ok(e.spawn[0] >= 0 && e.spawn[0] < rooms[e.to].width);
      assert.ok(e.spawn[1] >= 0 && e.spawn[1] < rooms[e.to].height);
    }
  }
  assert.equal(Object.keys(rooms).length, 25);
});
test("versioned save slots persist progression and reject corrupt data", () => {
  const memory = new Map<string, string>();
  const store = new SaveStore({
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => {
      memory.set(k, v);
    },
    removeItem: (k) => {
      memory.delete(k);
    },
  });
  const data = newSave();
  data.dash = true;
  data.bossDefeated = true;
  data.discovered.push("roots");
  assert.equal(store.save(0, data), true);
  assert.equal(store.load(0)?.dash, true);
  assert.equal(store.load(1), null);
  store.save(1, newSave());
  assert.equal(store.load(1)?.dash, false);
  assert.equal(validateSave({ ...data, version: 1 }), null);
  assert.equal(validateSave({ ...data, maxHealth: NaN }), null);
  assert.equal(
    validateSave({ ...data, checkpoint: { room: "bad", x: 0, y: 0 } }),
    null,
  );
  memory.set("echoes-v2-slot-2", "broken");
  assert.equal(store.load(2), null);
});
test("storage failure is surfaced instead of claimed as saved", () => {
  const store = new SaveStore({
    getItem: () => null,
    setItem: () => {
      throw new Error("Quota");
    },
    removeItem: () => {},
  });
  assert.equal(store.save(0, newSave()), false);
});
test("touch actions release after pointer cancellation and gamepad mapping/disconnect", () => {
  const listeners: Record<string, Function> = {};
  const btnListeners: Record<string, Function> = {};
  const classes = { add: () => {}, remove: () => {} };
  Object.assign(globalThis, {
    window: {
      addEventListener: (k: string, fn: Function) => {
        listeners[k] = fn;
      },
    },
    document: {
      hidden: false,
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [
        {
          dataset: { action: "jump" },
          classList: classes,
          addEventListener: (k: string, fn: Function) => {
            btnListeners[k] = fn;
          },
          setPointerCapture: () => {},
        },
      ],
    },
  });
  let pad: any = null;
  Object.defineProperty(globalThis, "navigator", {
    value: { getGamepads: () => [pad] },
    configurable: true,
  });
  const store = new SaveStore({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  const controls = new Input(store.settings());
  btnListeners.pointerdown({ preventDefault: () => {}, pointerId: 1 });
  controls.poll();
  assert.equal(controls.tap("jump"), true);
  btnListeners.pointercancel();
  controls.poll();
  assert.equal(controls.down("jump"), false);
  pad = {
    connected: true,
    index: 0,
    axes: [0.6, 0],
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 2 })),
  };
  controls.poll();
  assert.equal(controls.down("right"), true);
  assert.equal(controls.tap("attack"), true);
  pad = null;
  controls.poll();
  assert.equal(controls.down("right"), false);
  assert.equal(controls.down("attack"), false);
});
