#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const pkgPath = path.join(projectRoot, "package.json");

if (!fs.existsSync(pkgPath)) {
  console.error(`❌ package.json not found in ${projectRoot}`);
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const fieldsToOmit = [
  "scripts",
  "devDependencies",
  "jest",
  "eslintConfig",
  "files",
];
for (const field of fieldsToOmit) {
  delete rootPkg[field];
}

const fixPath = (p) => {
  if (typeof p !== "string") return p;
  return p.replace(/^(\.?\/?)?(dist\/)?/, "./");
};

if (rootPkg.main) rootPkg.main = fixPath(rootPkg.main);
if (rootPkg.types) rootPkg.types = fixPath(rootPkg.types);
if (rootPkg.module) rootPkg.module = fixPath(rootPkg.module);

if (rootPkg.exports) {
  const handleExports = (obj) => {
    if (typeof obj === "string") return fixPath(obj);
    if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        obj[key] = handleExports(obj[key]);
      }
    }
    return obj;
  };

  rootPkg.exports = handleExports(rootPkg.exports);
}

const distDir = path.join(projectRoot, "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify(rootPkg, null, 2),
  "utf-8",
);

console.log("✓ Clean package.json generated in dist/");
