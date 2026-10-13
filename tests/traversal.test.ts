import { test } from "node:test";
import assert from "node:assert/strict";
import { makePlayer, movePlayer } from "../src/player/physics.ts";
import { rooms } from "../src/world/rooms.ts";
import { overlaps, type Platform, type Room } from "../src/core/types.ts";

function landings(
  room: Room,
  from: number,
  holdJump: boolean,
  movingOffset = 0,
  dash = false,
) {
  const platforms = room.platforms.map((p) => ({
    ...p,
    y: p.y + (p.kind === "moving" ? movingOffset : 0),
  }));
  const source = platforms[from],
    reached = new Set<number>();
  for (const dir of [-1, 1])
    for (let x = source.x + 8; x <= source.x + source.w - 42; x += 20) {
      const p = makePlayer(x, source.y - 68);
      p.grounded = true;
      p.vx = dir * 310;
      if (platforms.some((r, i) => i !== from && overlaps(p, r))) continue;
      for (let step = 0; step < 230; step++) {
        const collision: Platform[] = [...platforms];
        if (room.id === "afterglow" && !p.dash)
          collision.push({ x: 600, y: 370, w: 42, h: 430 });
        movePlayer(
          p,
          {
            down: (a) =>
              (a === "jump" && holdJump) || a === (dir > 0 ? "right" : "left"),
            tap: (a) =>
              (a === "jump" && step === 0) ||
              (a === "dash" && dash && step === 20),
          },
          collision,
          1 / 120,
          dash,
        );
        if (
          room.hazards.some((h) => overlaps(p, h)) ||
          p.y > room.height ||
          p.x < 0 ||
          p.x > room.width
        )
          break;
        if (step > 4 && p.grounded) {
          for (const [to, target] of platforms.entries())
            if (
              Math.abs(p.y + p.h - target.y) < 1 &&
              p.x + p.w > target.x &&
              p.x < target.x + target.w
            ) {
              // A corner landing must let the player walk fully onto the ledge.
              if (
                (dir > 0 && p.x + p.w - target.x < 8) ||
                (dir < 0 && target.x + target.w - p.x < 8)
              )
                for (let i = 0; i < 12; i++)
                  movePlayer(
                    p,
                    {
                      down: (a) => a === (dir > 0 ? "right" : "left"),
                      tap: () => false,
                    },
                    platforms,
                    1 / 120,
                    dash,
                  );
              if (
                p.grounded &&
                Math.abs(p.y + p.h - target.y) < 1 &&
                p.x + p.w > target.x + 8 &&
                p.x < target.x + target.w - 8
              )
                reached.add(to);
            }
          break;
        }
      }
    }
  return reached;
}
function reachable(room: Room, hold: boolean, offset: number, dash = false) {
  const edges = room.platforms.map((_, i) =>
    landings(room, i, hold, offset, dash),
  );
  const reached = new Set([0]);
  for (let i = 0; i < edges.length; i++)
    for (const from of [...reached])
      for (const to of edges[from]) reached.add(to);
  return room.platforms
    .map((p, i) => ({ i, x: p.x, y: p.y }))
    .filter((p) => !reached.has(p.i));
}
for (const room of Object.values(rooms).filter((r) => r.id !== "afterglow"))
  test(`${room.id}: every platform is reachable without dash`, () => {
    for (const offset of room.platforms.some((p) => p.kind === "moving")
      ? [-40, 0, 40]
      : [0])
      assert.deepEqual(
        reachable(room, true, offset),
        [],
        `moving offset ${offset}`,
      );
  });
for (const room of Object.values(rooms).filter((r) => r.id !== "afterglow"))
  test(`${room.id}: short touch taps have a usable route`, () =>
    assert.deepEqual(reachable(room, false, 0), []));
test("dash crosses the post-boss light barrier and reaches the exit shrine", () =>
  assert.deepEqual(reachable(rooms.afterglow, true, 0, true), []));
test("the light barrier still prevents traversal without the unlocked dash", () =>
  assert.ok(reachable(rooms.afterglow, true, 0, false).some((p) => p.i === 1)));
test("room connection spawns do not intersect terrain or immediately bounce through an upper exit", () => {
  for (const room of Object.values(rooms))
    for (const exit of room.exits) {
      const target = rooms[exit.to],
        p = makePlayer(...exit.spawn);
      assert.equal(
        target.platforms.some((r) => overlaps(p, r)),
        false,
        `${room.id} -> ${target.id} spawn`,
      );
      assert.equal(
        target.exits.some((e) => e.side === "up" && p.y < 220 && p.x > 1730),
        false,
        `${room.id} -> ${target.id} upper exit`,
      );
    }
});
test("near-top corner collision settles onto the ledge without killing jump momentum against its side", () => {
  const p = makePlayer(100, 455);
  p.vx = 310;
  p.vy = -180;
  const platform = [{ x: 132, y: 520, w: 200, h: 38 }];
  for (let i = 0; i < 10; i++)
    movePlayer(
      p,
      { down: (a) => a === "right" || a === "jump", tap: () => false },
      platform,
      1 / 120,
      false,
    );
  assert.equal(p.grounded, true);
  assert.equal(p.y, 452);
  assert.ok(p.x > 100);
});
