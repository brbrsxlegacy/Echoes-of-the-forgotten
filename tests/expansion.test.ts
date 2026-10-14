import { test } from "node:test";
import assert from "node:assert/strict";
import { newSave, validateSave } from "../src/saving/store.ts";
import { gateOpen, regions, regionOf } from "../src/world/regions.ts";
import { awardBoss, returnFragments } from "../src/systems/progression.ts";
import { rooms } from "../src/world/rooms.ts";
import { makePlayer, movePlayer } from "../src/player/physics.ts";
import {
  makeEnemy,
  updateEnemies,
  strike,
  attackBox,
} from "../src/combat/enemies.ts";
import type { Shot } from "../src/core/types.ts";
test("old Grove v2 saves migrate without losing checkpoint or upgrades", () => {
  const old: any = newSave();
  old.bossDefeated = true;
  old.dash = true;
  old.maxHealth = 9;
  old.collected = ["canopy-heart"];
  for (const key of [
    "bosses",
    "tide",
    "ember",
    "switches",
    "quests",
    "relics",
    "equipped",
  ])
    delete old[key];
  const v = validateSave(old)!;
  assert.equal(v.maxHealth, 9);
  assert.deepEqual(v.checkpoint, old.checkpoint);
  assert.deepEqual(v.collected, old.collected);
  assert.deepEqual(v.bosses, ["bellkeeper"]);
  assert.equal(v.tide, false);
  assert.deepEqual(v.switches, {});
});
test("expanded saves round trip and reject invalid switch or unowned equipment", () => {
  const v = newSave();
  awardBoss(v, "cantor");
  awardBoss(v, "ashknight");
  v.switches = { sluice: 2, "forge-a": 1, "forge-b": 0, "forge-c": 2 };
  v.relics = ["keen"];
  v.equipped = "keen";
  v.discovered.push("ashwatch");
  v.checkpoint = { room: "ashwatch", x: 293, y: 662 };
  assert.deepEqual(validateSave(v), v);
  assert.equal(validateSave({ ...v, switches: { sluice: 7 } }), null);
  assert.equal(validateSave({ ...v, equipped: "aegis" }), null);
  assert.equal(validateSave({ ...v, tide: "true" }), null);
});
test("25 connected rooms belong to three regions and no room is permanently stranded", () => {
  assert.equal(Object.keys(regions).length, 3);
  assert.equal(
    Object.values(rooms).filter((r) => regionOf(r) === "drowned").length,
    8,
  );
  assert.equal(
    Object.values(rooms).filter((r) => regionOf(r) === "ashen").length,
    8,
  );
  const reached = new Set(["lantern"]);
  for (let i = 0; i < 25; i++)
    for (const id of [...reached])
      for (const e of rooms[id].exits) reached.add(e.to);
  assert.equal(reached.size, 25);
  for (const source of Object.keys(rooms)) {
    const back = new Set([source]);
    for (let i = 0; i < 25; i++)
      for (const id of [...back])
        for (const e of rooms[id].exits) back.add(e.to);
    assert.ok(back.has("lantern"), source + " recovery route");
  }
});
test("sluice and forge solutions open only the matching real gate", () => {
  const d = newSave();
  assert.equal(gateOpen(d, "sluice"), false);
  d.switches.sluice = 1;
  assert.equal(gateOpen(d, "sluice"), false);
  d.switches.sluice = 2;
  assert.equal(gateOpen(d, "sluice"), true);
  d.switches["forge-a"] = 1;
  d.switches["forge-c"] = 2;
  assert.equal(gateOpen(d, "forge"), true);
  d.switches["forge-b"] = 0;
  assert.equal(gateOpen(d, "forge"), true);
  d.switches["forge-b"] = 1;
  assert.equal(gateOpen(d, "forge"), false);
});
test("boss rewards persist once and unlock the next traversal gate", () => {
  const d = newSave();
  for (const kind of ["boss", "cantor", "ashknight"] as const) {
    assert.equal(awardBoss(d, kind), true);
    assert.equal(awardBoss(d, kind), false);
  }
  assert.equal(d.currency, 300);
  assert.deepEqual(d.bosses, ["bellkeeper", "cantor", "ashknight"]);
  assert.ok(gateOpen(d, "dash") && gateOpen(d, "tide") && gateOpen(d, "ember"));
});
test("optional NPC quests require three fragments and never duplicate rewards", () => {
  const d = newSave();
  d.collected = ["canticle-1", "canticle-2"];
  assert.equal(returnFragments(d, "mira").complete, false);
  d.collected.push("canticle-3");
  assert.equal(returnFragments(d, "mira").complete, true);
  assert.equal(d.maxHealth, 7);
  assert.equal(returnFragments(d, "mira").complete, false);
  assert.equal(d.currency, 75);
  d.collected.push("ember-1", "ember-2", "ember-3");
  assert.equal(returnFragments(d, "wren").complete, true);
  assert.deepEqual(d.relics, ["aegis"]);
  assert.equal(d.currency, 150);
});
test("Tide Breath enables controlled swimming against gravity and respects terrain", () => {
  const p = makePlayer(100, 662);
  p.grounded = true;
  const floor = [{ x: 0, y: 730, w: 1920, h: 200 }];
  for (let i = 0; i < 120; i++)
    movePlayer(
      p,
      { down: (a) => a === "jump", tap: () => false },
      floor,
      1 / 120,
      true,
      true,
    );
  assert.ok(p.y < 470);
  assert.equal(p.airDash, true);
  for (let i = 0; i < 240; i++)
    movePlayer(
      p,
      { down: (a) => a === "down", tap: () => false },
      floor,
      1 / 120,
      true,
      true,
    );
  assert.equal(p.y, 662);
  assert.equal(p.grounded, true);
});
for (const kind of ["diver", "leech", "ashwalker", "warden"] as const)
  test(
    kind + " detects player, telegraphs, attacks and can be defeated",
    () => {
      const p = makePlayer(320, 662, 20, 20);
      const e = makeEnemy(kind, 370, kind === "leech" ? 600 : 640, "test");
      const shots: Shot[] = [];
      let telegraph = false,
        damage = false;
      for (let i = 0; i < 800; i++) {
        p.invuln = Math.max(0, p.invuln - 1 / 120);
        const events = updateEnemies([e], p, 1 / 120, shots, false);
        telegraph ||= events.some((x) => x.type === "telegraph");
        damage ||= events.some((x) => x.type === "hurt");
      }
      assert.ok(telegraph);
      assert.ok(damage);
      p.hitIds.clear();
      assert.ok(
        strike(p, [e], { x: 0, y: 0, w: 1920, h: 900 }, 20, false).some(
          (x) => x.type === "kill",
        ),
      );
    },
  );
for (const kind of ["cantor", "ashknight"] as const)
  test(
    kind +
      " commits telegraph aim, traverses all phases and parries into recovery",
    () => {
      const p = makePlayer(400, 662);
      const e = makeEnemy(kind, 500, kind === "cantor" ? 515 : 500, "boss");
      const shots: Shot[] = [];
      e.timer = 0;
      updateEnemies([e], p, 1 / 120, shots, false);
      const aim = e.targetX;
      assert.equal(e.state, "windup");
      p.x = 800;
      for (let i = 0; i < 15; i++) updateEnemies([e], p, 1 / 120, shots, false);
      assert.equal(e.targetX, aim);
      e.state = "attack";
      e.pattern = 1;
      e.attackDir = -1;
      e.timer = 0.4;
      e.hitPlayer = false;
      p.x = e.x - 70;
      p.parry = 0.15;
      assert.ok(
        updateEnemies([e], p, 1 / 120, shots, false).some(
          (x) => x.type === "parry",
        ),
      );
      assert.equal(e.state, "recover");
      assert.ok(e.timer > 1.5);
      e.hp = 10;
      updateEnemies([e], p, 1 / 120, shots, false);
      assert.equal(e.phase, 3);
      p.hitIds.clear();
      assert.ok(
        strike(p, [e], { x: 0, y: 0, w: 1920, h: 900 }, 20, false).some(
          (x) => x.type === "boss-defeat",
        ),
      );
    },
  );
