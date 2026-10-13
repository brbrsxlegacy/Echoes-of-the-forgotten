import { createReadStream, createWriteStream, chmodSync } from "node:fs";
import { createBrotliDecompress } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const root = process.cwd() + "/.qa-browser";
mkdirSync(root, { recursive: true });
for (const name of ["chromium", "swiftshader.tar", "fonts.tar"]) {
  await pipeline(
    createReadStream(`node_modules/@sparticuz/chromium/bin/${name}.br`),
    createBrotliDecompress(),
    createWriteStream(`${root}/${name}`),
  );
  if (name.endsWith(".tar"))
    execFileSync("tar", [
      "--no-same-owner",
      "-xf",
      `${root}/${name}`,
      "-C",
      root,
    ]);
}
chmodSync(`${root}/chromium`, 0o755);
console.log("Browser extracted from official npm package.");
