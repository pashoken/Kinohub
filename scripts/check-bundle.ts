import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const output = join(process.cwd(), "apps", "web", "dist");
const html = readFileSync(join(output, "index.html"), "utf8");
const scripts = [
  ...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g),
].map((match) => match[1]);
if (!scripts.length)
  throw new Error("Client entry script was not found in dist/index.html");
const bytes = scripts.reduce(
  (total, file) =>
    total + gzipSync(readFileSync(join(output, file))).byteLength,
  0,
);
const budget = 350 * 1024;
if (bytes > budget) throw new Error(`Client JS ${bytes} exceeds ${budget}`);
process.stdout.write(
  `BUNDLE_OK gzip=${bytes} budget=${budget} files=${scripts.length}\nARTWORK_TARGETS=190px@1280,220px@1920\n`,
);
