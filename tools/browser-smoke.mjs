// Smoke-test the production build without development hooks.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
await new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (d.toString().includes("Local:")) resolve();
  });
  server.on("exit", reject);
});
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--no-zygote",
    "--single-process",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:4174/", { waitUntil: "networkidle" });
for(const region of ['drowned','ashen'])for(const file of [region+'.webp',region+'-atlas.webp',region+'-frames.json']){const r=await page.request.get('http://127.0.0.1:4174/assets/environments/'+file);assert.equal(r.status(),200);}
await page.locator("#new").click();
await page.locator("#slot-0").click();
await page.waitForTimeout(1000);
assert.equal(await page.locator("#overlay").isVisible(), false);
await page.keyboard.press("m", { delay: 100 });
await page.locator(".world-map").waitFor();
await page.locator("#resume").click();
await page.keyboard.press("Escape", { delay: 100 });
await page.locator("#main").click();
assert.equal(await page.locator("#continue").isEnabled(), true);
assert.equal(await page.evaluate(() => window.__game === undefined), true);
assert.deepEqual(errors, []);
// Wait for the finished precache, then cache the hashed production shell under control.
await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
await page.reload({waitUntil:'networkidle'});
await page.locator('#continue').waitFor();
await page.context().setOffline(true);
await page.reload({waitUntil:'domcontentloaded'});
await page.locator('#continue').click();
assert.equal(await page.locator('#overlay').isVisible(),false);
await page.keyboard.press('m',{delay:100});await page.locator('.world-map').waitFor();
assert.deepEqual(errors,[]);
console.log(JSON.stringify({ production: "pass", newAssets:'pass', offlineReloadAndPlay:'pass', errors }));
await browser.close();
server.kill();
