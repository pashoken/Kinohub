import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const skipped = new Set([
  ".git",
  ".supergoal",
  "node_modules",
  "dist",
  "coverage",
  "artifacts",
  "test-results",
  "playwright-report",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".html",
  ".css",
  ".env",
  ".txt",
]);
const findings: Array<{ file: string; rule: string }> = [];
const rules = [
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  },
  { name: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/ },
  {
    name: "assigned-secret",
    pattern:
      /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9+/_.-]{16,}["']/i,
  },
];
function walk(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skipped.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (
      textExtensions.has(extname(entry.name)) &&
      statSync(path).size < 2_000_000
    ) {
      const source = readFileSync(path, "utf8");
      for (const rule of rules)
        if (rule.pattern.test(source))
          findings.push({ file: relative(root, path), rule: rule.name });
    }
  }
}
walk(root);
mkdirSync(join(root, "artifacts", "reports"), { recursive: true });
const report = {
  scannedAt: new Date().toISOString(),
  findings,
  highSeverity: findings.length,
};
writeFileSync(
  join(root, "artifacts", "reports", "security.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
if (findings.length)
  throw new Error(`Secret scan found ${findings.length} potential secret(s)`);
process.stdout.write(
  "SECRETS_OK findings=0 private_keys=0 assigned_credentials=0\n",
);
