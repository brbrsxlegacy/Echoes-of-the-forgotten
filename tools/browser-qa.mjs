import { spawn } from "node:child_process";
import { chromium as pwLocal } from "playwright-core";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import chromium from "@sparticuz/chromium";
const pw = pwLocal;
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
await new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (d.toString().includes("Local:")) resolve();
  });
  server.on("exit", (c) => reject(new Error("Server exited " + c)));
  setTimeout(() => reject(new Error("server timeout")), 10000).unref();
});
const browser = await pw.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || (await chromium.executablePath()),
  args: chromium.args.filter((a) => !a.startsWith("--blink-settings")),
});
const errors = [];
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, pass: false, error: String(e) });
    console.log("FAIL " + name + " " + e);
  }
}
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const state = () =>
  page.evaluate(() => ({
    mode: window.__game.mode,
    room: window.__game.room.id,
    p: {
      x: window.__game.player.x,
      y: window.__game.player.y,
      hp: window.__game.player.hp,
      energy: window.__game.player.energy,
      grounded: window.__game.player.grounded,
      dash: window.__game.player.dash,
    },
    data: window.__game.data,
    enemy: window.__game.enemies.map((e) => ({ hp: e.hp, state: e.state })),
    audio: window.__game.audio.context?.state,
  }));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await check("Title menu and all assets initialize", async () => {
  await page.locator("#new").waitFor();
  assert.equal(
    await page.evaluate(() => Object.keys(window.__game.assets.images).length),
    4,
  );
  await page.screenshot({ path: "test-output/title.png" });
});
await check("New game + Web Audio user gesture", async () => {
  await page.locator("#new").click();
  await page.locator("#slot-0").click();
  await page.waitForTimeout(2000);
  assert.equal((await state()).mode, "playing");
  assert.equal((await state()).audio, "running");
});
await check("Real keyboard movement, jumping, landing", async () => {
  const before = await state();
  await page.keyboard.down("d");
  await page.waitForTimeout(900);
  await page.keyboard.up("d");
  assert.ok((await state()).p.x > before.p.x + 50);
  await page.keyboard.down("Space");
  await page.waitForTimeout(180);
  assert.ok((await state()).p.y < before.p.y - 45);
  await page.keyboard.up("Space");
  await page.waitForFunction(() => window.__game.player.grounded);
  assert.equal((await state()).p.grounded, true);
});
await check(
  "Save shrine, refresh and Continue persist checkpoint",
  async () => {
    await page.evaluate(() => {
      window.__game.player.x = 320;
      window.__game.player.y = 662;
    });
    await page.keyboard.press("e", { delay: 80 });
    await page.waitForTimeout(180);
    assert.equal((await state()).data.checkpoint.x, 323);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#continue").click();
    await page.waitForTimeout(400);
    assert.equal((await state()).p.x, 323);
  },
);
await check("NPC conversation, typewriter and skip", async () => {
  await page.evaluate(() => {
    window.__game.player.x = 495;
    window.__game.player.y = 662;
  });
  await page.keyboard.press("e", { delay: 80 });
  await page.waitForTimeout(100);
  assert.equal((await state()).mode, "dialogue");
  await page.locator("#skip").click();
  assert.equal((await state()).mode, "playing");
});
await check("Map opens, markers and inventory menus close", async () => {
  await page.keyboard.press("m", { delay: 80 });
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".map-room").count(), 1);
  await page.locator('[data-room="lantern"]').click();
  assert.match(await page.locator("#map-selected").innerText(), /işaretlendi/);
  await page.locator("#resume").click();
  await page.waitForTimeout(200);
  await page.keyboard.press("i", { delay: 80 });
  await page.waitForTimeout(100);
  assert.match(await page.locator(".panel").innerText(), /Yankı İğnesi/);
  await page.locator("#back").click();
  await page.locator("#resume").click();
});
await check("Enemy damaged and defeated by real combo input", async () => {
  await page.evaluate(() => {
    const g = window.__game;
    g.mode = "playing";
    g.ui.hide();
    g.loadRoom("roots", 300, 662);
    g.enemies = g.enemies.slice(0, 1);
    g.player.invuln = 0;
  });
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("j", { delay: 100 });
    const time = await page.evaluate(() => window.__game.time);
    await page.waitForFunction((t) => window.__game.time > t + 0.34, time);
  }
  assert.equal((await state()).enemy[0].hp, 0);
  assert.ok((await state()).data.currency >= 12);
});
await check(
  "Enemy attack damages player and hazard respawns safely",
  async () => {
    await page.evaluate(() => {
      const g = window.__game;
      g.mode = "playing";
      g.ui.hide();
      g.loadRoom("roots", 310, 662);
      g.enemies = g.enemies.slice(0, 1);
      g.player.invuln = 0;
      g.player.hp = 6;
    });
    await page.waitForTimeout(3000);
    assert.ok((await state()).p.hp < 6);
    await page.evaluate(() => {
      const g = window.__game;
      g.player.invuln = 0;
      g.player.x = 620;
      g.player.y = 840;
      g.player.safeX = 300;
      g.player.safeY = 662;
    });
    await page.waitForTimeout(100);
    assert.equal((await state()).p.x, 300);
    assert.ok((await state()).p.y < 730);
  },
);
await check("Perfect parry with real K input", async () => {
  await page.evaluate(() => {
    const g = window.__game;
    g.mode = "playing";
    g.ui.hide();
    g.loadRoom("roots", 310, 662);
    g.enemies = g.enemies.slice(0, 1);
    const e = g.enemies[0];
    e.x = 355;
    e.state = "windup";
    e.timer = 0.08;
    g.player.invuln = 0;
    g.player.hp = 6;
  });
  await page.keyboard.press("k", { delay: 80 });
  await page.waitForTimeout(250);
  assert.equal((await state()).enemy[0].state, "recover");
  assert.equal((await state()).p.hp, 6);
});
await check("Musical puzzle opens an actual gated passage", async () => {
  await page.evaluate(() => {
    const g = window.__game;
    g.mode = "playing";
    g.ui.hide();
    g.loadRoom("chimes", 680, 662);
    g.enemies = [];
    g.data.puzzleSolved = false;
  });
  for (const x of [680, 1370, 1020]) {
    await page.evaluate((x) => {
      window.__game.player.x = x;
      window.__game.player.y = 662;
    }, x);
    await page.keyboard.press("e", { delay: 80 });
    await page.waitForTimeout(110);
  }
  assert.equal((await state()).data.puzzleSolved, true);
  await page.evaluate(() => {
    window.__game.player.x = 1890;
  });
  await page.waitForTimeout(100);
  assert.equal((await state()).room, "vigil");
});
await check(
  "Bellkeeper full combat simulation beats all phases without invulnerability or health injection",
  async () => {
    const result = await page.evaluate(() => {
      const g = window.__game;
      g.loadRoom("bell", 300, 662);
      g.mode = "playing";
      g.player.hp = 6;
      g.player.energy = 100;
      g.player.invuln = 0;
      g.settings.assist = false;
      let strikes = 0,
        parries = 0,
        minHp = 6;
      for (
        let i = 0;
        i < 24000 && g.mode === "playing" && !g.data.bossDefeated;
        i++
      ) {
        const p = g.player,
          e = g.enemies[0];
        const held = new Set();
        const taps = new Set();
        const dist = e.x - p.x - p.w;
        const canAttack = dist < 102 && dist > 0;
        const front = e.x > p.x;
        if (dist > 75 && e.state !== "attack") held.add("right");
        if (dist < 25) held.add("left");
        if (
          e.state === "windup" &&
          e.timer < 0.16 &&
          p.parryCooldown <= 0 &&
          Math.abs(dist) < 220
        ) {
          taps.add("parry");
          parries++;
        }
        if (
          (e.state === "attack" && p.parry <= 0) ||
          g.shots.some((s) => !s.friendly && Math.abs(s.x - p.x) < 170)
        ) {
          held.add("jump");
          if (p.grounded) taps.add("jump");
        }
        if (canAttack && p.attack < 0.07 && e.state !== "attack") {
          taps.add("attack");
          strikes++;
        }
        if (
          p.hp < 4 &&
          p.energy >= 40 &&
          p.grounded &&
          e.state === "recover" &&
          e.timer > 0.9
        )
          taps.add("heal");
        if (p.energy >= 35 && canAttack && e.state === "recover")
          taps.add("ability");
        g.input.held = held;
        g.input.pressed = taps;
        g.update(1 / 120, true);
        minHp = Math.min(minHp, p.hp);
      }
      return {
        won: g.data.bossDefeated,
        hp: g.player.hp,
        minHp,
        strikes,
        parries,
        bossHp: g.enemies[0]?.hp,
        mode: g.mode,
      };
    });
    console.log("Boss simulation " + JSON.stringify(result));
    assert.equal(result.won, true);
    assert.ok(result.minHp > 0);
  },
);
await check(
  "Unlocked dash traverses light barrier; dash remains saved",
  async () => {
    await page.evaluate(() => {
      const g = window.__game;
      g.mode = "playing";
      g.ui.hide();
      g.loadRoom("afterglow", 520, 610);
      g.player.grounded = false;
      g.player.invuln = 0;
      g.player.airDash = true;
      g.player.dashCooldown = 0;
      g.input.clear();
    });
    await page.keyboard.down("d");
    await page.keyboard.press("Shift", { delay: 150 });
    const time = await page.evaluate(() => window.__game.time);
    await page.waitForFunction((t) => window.__game.time > t + 0.22, time);
    await page.keyboard.up("d");
    assert.ok((await state()).p.x > 662);
    assert.equal((await state()).data.dash, true);
    await page.evaluate(() => window.__game.save(false));
    assert.equal(
      await page.evaluate(() => window.__game.store.load(0).dash),
      true,
    );
  },
);
await check("Real running game screenshot and resizing", async () => {
  await page.evaluate(() => {
    const g = window.__game;
    g.mode = "playing";
    g.ui.hide();
    g.loadRoom("bell", 920, 662);
    g.data.bossDefeated = false;
    g.loadRoom("bell", 920, 662);
  });
  await page.waitForTimeout(750);
  await page.screenshot({ path: "test-output/bellkeeper.png" });
  await page.evaluate(() => {
    const g = window.__game;
    g.loadRoom("lantern", 600, 662);
    g.toastTimer = 0;
    g.roomTitle = 0;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "test-output/grove.png" });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(100);
  assert.equal(await page.locator("canvas").count(), 1);
});
const mobile = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const mp = await mobile.newPage();
mp.on("pageerror", (e) => errors.push(String(e)));
await check("Mobile landscape menu and actual pointer controls", async () => {
  await mp.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await mp.locator("#new").click();
  await mp.locator("#slot-0").click();
  if (await mp.locator("#yes").count()) await mp.locator("#yes").click();
  await mp.waitForTimeout(800);
  console.log(
    "Mobile state",
    await mp.evaluate(() => ({
      mode: window.__game.mode,
      screen: window.__game.ui.screen,
      touch: document.querySelector("#touch").className,
      html: document.documentElement.className,
      maxTouch: navigator.maxTouchPoints,
      coarse: matchMedia("(pointer:coarse)").matches,
    })),
  );
  await mp.screenshot({ path: "test-output/mobile.png" });
  assert.equal(await mp.locator('[data-action="jump"]').isVisible(), true);
  const before = await mp.evaluate(() => window.__game.player.x);
  const rect = await mp.locator('[data-action="right"]').boundingBox();
  await mp.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await mp.mouse.down();
  await mp.waitForFunction((x) => window.__game.player.x > x + 50, before);
  await mp.mouse.up();
  assert.ok((await mp.evaluate(() => window.__game.player.x)) > before + 30);
  await mp.locator('[data-action="jump"]').tap();
  await mp.waitForTimeout(120);
  assert.ok((await mp.evaluate(() => window.__game.player.y)) < 660);
  await mp.screenshot({ path: "test-output/mobile.png" });
});

await check(
  "Portrait iPhone viewport fills the play area without stretching or hiding Nilo",
  async () => {
    await mp.setViewportSize({ width: 390, height: 844 });
    await mp.waitForFunction(() => window.__game.renderer.w < 700);
    const geometry = await mp.evaluate(() => {
      const g = window.__game,
        c = document.querySelector("canvas"),
        r = c.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        logical: g.renderer.w,
        ratio: c.width / c.height,
        playerX: g.player.x + 17 - g.camera.x,
        viewport: r.width / r.height,
      };
    });
    assert.ok(geometry.height > 550);
    assert.ok(Math.abs(geometry.ratio - geometry.viewport) < 0.01);
    assert.ok(geometry.playerX >= 0 && geometry.playerX <= geometry.logical);
    await mp.screenshot({ path: "test-output/portrait-fixed.png" });
  },
);
await check(
  "Holding controls cannot select text or open a canvas context menu",
  async () => {
    const result = await mp.evaluate(() => {
      const c = document.querySelector("canvas");
      const e = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      c.dispatchEvent(e);
      const s = new Event("selectstart", { bubbles: true, cancelable: true });
      c.dispatchEvent(s);
      return {
        menu: e.defaultPrevented,
        selection: s.defaultPrevented,
        css: getComputedStyle(c).webkitUserSelect,
      };
    });
    assert.equal(result.menu, true);
    assert.equal(result.selection, true);
    assert.equal(result.css, "none");
  },
);
await check("Rotating back to landscape restores the wide camera", async () => {
  await mp.setViewportSize({ width: 844, height: 390 });
  await mp.waitForFunction(() => window.__game.renderer.w === 1280);
  assert.equal(await mp.locator('[data-action="jump"]').isVisible(), true);
});
await check("No critical browser console errors", async () =>
  assert.deepEqual(errors, []),
);
await writeFile(
  "test-output/browser-results.json",
  JSON.stringify({ results, errors }, null, 2),
);
await browser.close();
server.kill();
if (results.some((r) => !r.pass)) process.exitCode = 1;
