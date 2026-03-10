import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const scope = process.argv[2] || "all";

const JS_LIKE = /\.(js|jsx|cjs|mjs)$/;
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "downloads",
  "screenshots",
  "videos",
]);

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (JS_LIKE.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function matchLines(content, pattern) {
  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => pattern.test(line));
}

function checkFiles(files, { id, pattern, message, allowList = [] }) {
  const allowed = new Set(allowList.map((file) => file.replace(/\\/g, "/")));
  const violations = [];

  for (const filePath of files) {
    const relPath = relative(filePath);
    if (allowed.has(relPath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const hits = matchLines(content, pattern);
    for (const hit of hits) {
      violations.push({
        rule: id,
        file: relPath,
        lineNumber: hit.lineNumber,
        line: hit.line.trim(),
        message,
      });
    }
  }

  return violations;
}

const allViolations = [];

if (scope === "all" || scope === "frontend") {
  const frontendFiles = walk(path.join(repoRoot, "frontend", "src"));

  allViolations.push(
    ...checkFiles(frontendFiles, {
      id: "frontend-no-alert",
      pattern: /\balert\s*\(/,
      message: "Use controlled UI feedback instead of alert().",
    })
  );

  allViolations.push(
    ...checkFiles(frontendFiles, {
      id: "frontend-no-console-log",
      pattern: /console\.log\s*\(/,
      message: "Remove debug console.log() calls from frontend source.",
    })
  );

  allViolations.push(
    ...checkFiles(frontendFiles, {
      id: "frontend-no-authstorage-pages",
      pattern: /authStorage\.getUser\s*\(/,
      message: "Use AuthContext instead of reading authStorage directly in pages/components.",
    })
  );

  allViolations.push(
    ...checkFiles(frontendFiles, {
      id: "frontend-localstorage-boundary",
      pattern: /localStorage\./,
      message:
        "Access localStorage only through AuthContext, CartContext, or authStorage helper.",
      allowList: [
        "frontend/src/context/AuthContext.jsx",
        "frontend/src/context/CartContext.jsx",
        "frontend/src/lib/authStorage.js",
      ],
    })
  );

  allViolations.push(
    ...checkFiles(frontendFiles, {
      id: "frontend-no-window-location-href",
      pattern: /window\.location\.href\s*=/,
      message: "Prefer navigate(), assign(), or backend-driven redirects over href mutation.",
    })
  );
}

if (scope === "all" || scope === "backend") {
  const backendFiles = walk(path.join(repoRoot, "backend"));

  allViolations.push(
    ...checkFiles(backendFiles, {
      id: "backend-no-dev-jwt-secret",
      pattern: /dev-secret-123/,
      message: "Hardcoded JWT dev fallback secret is not allowed.",
    })
  );
}

if (allViolations.length > 0) {
  console.error("Code standards check failed:\n");
  for (const violation of allViolations) {
    console.error(
      `- [${violation.rule}] ${violation.file}:${violation.lineNumber} ${violation.message}`
    );
    console.error(`  ${violation.line}`);
  }
  process.exit(1);
}

console.log(`Code standards passed for scope: ${scope}`);
