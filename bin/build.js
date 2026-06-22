#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/config.js";
import {
  logHeader,
  logStep,
  logDetail,
  logSuccess,
  logError,
} from "../src/format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
);

const startTime = Date.now();
const projectRoot = process.cwd();
const config = loadConfig(projectRoot);
const pkgPath = path.join(projectRoot, "package.json");

logHeader(toolPkg.name, "prep-dist", toolPkg.version);

try {
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json не найден в директории: ${projectRoot}`);
  }

  logStep("Очистка манифеста...");
  const rootPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  const fieldsToOmit = config.build?.omitFields ?? [
    "scripts",
    "devDependencies",
    "jest",
    "eslintConfig",
    "files",
    "publishConfig",
    "private",
  ];

  for (const field of fieldsToOmit) {
    if (field in rootPkg) delete rootPkg[field];
  }

  rootPkg.private = false;

  logStep("Адаптация путей для dist/...");

  const fixPath = (p) => {
    if (typeof p !== "string") return p;
    return `./${p.replace(/^(?:\.\/)?dist\//, "")}`;
  };

  const fixFields = config.build?.fixFields ?? [
    "main",
    "types",
    "module",
    "typesVersions",
  ];
  for (const field of fixFields) {
    if (rootPkg[field]) rootPkg[field] = fixPath(rootPkg[field]);
  }

  if (rootPkg.sideEffects && Array.isArray(rootPkg.sideEffects)) {
    rootPkg.sideEffects = rootPkg.sideEffects.map(fixPath);
  }

  if (rootPkg.exports) {
    const fix = (obj) => {
      if (typeof obj === "string") return fixPath(obj);
      if (typeof obj === "object" && obj !== null) {
        for (const k in obj) obj[k] = fix(obj[k]);
      }
      return obj;
    };
    rootPkg.exports = fix(rootPkg.exports);
    logDetail(
      `Экспорты пересобраны: ${Object.keys(rootPkg.exports).join(", ")}`,
    );
  }

  logStep("Сохранение dist/package.json...");
  const distDir = path.join(projectRoot, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(distDir, "package.json"),
    JSON.stringify(rootPkg, null, 2),
    "utf-8",
  );

  const copyFiles = config.build?.copyFiles ?? ["LICENSE", "README.md"];
  for (const file of copyFiles) {
    const src = path.join(projectRoot, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(distDir, file));
      logDetail(`Copied: ${file}`);
    }
  }

  logSuccess("Dist manifest ready!", Date.now() - startTime);
} catch (e) {
  logError(`Build failed: ${e.message}`);
  process.exit(1);
}
