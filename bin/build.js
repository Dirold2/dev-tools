#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolPkgPath = path.join(__dirname, "../package.json");
const toolPkg = JSON.parse(fs.readFileSync(toolPkgPath, "utf-8"));

const TOOL_NAME = toolPkg.name;
const TOOL_VERSION = toolPkg.version;

const bold = (txt) => `\x1b[1m${txt}\x1b[0m`;
const green = (txt) => `\x1b[32m${txt}\x1b[0m`;
const cyan = (txt) => `\x1b[36m${txt}\x1b[0m`;
const gray = (txt) => `\x1b[90m${txt}\x1b[0m`;
const red = (txt) => `\x1b[31m${txt}\x1b[0m`;

const startTime = Date.now();
const projectRoot = process.cwd();
const pkgPath = path.join(projectRoot, "package.json");

console.log(`\n● ${bold(TOOL_NAME)} ${gray(`publish v${TOOL_VERSION}`)}\n`);

try {
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json не найден в директории: ${projectRoot}`);
  }

  console.log(`${cyan("[1/3]")} 🧹 Удаление девелоперских полей...`);
  const rootPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  const fieldsToOmit = [
    "scripts",
    "devDependencies",
    "jest",
    "eslintConfig",
    "files",
  ];

  let omittedCount = 0;
  for (const field of fieldsToOmit) {
    if (field in rootPkg) {
      delete rootPkg[field];
      omittedCount++;
    }
  }
  if (omittedCount > 0) {
    console.log(gray(`      Вырезано полей: ${omittedCount}`));
  }

  console.log(`${cyan("[2/3]")} 🪛 Корректировка путей экспорта...`);
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
    console.log(gray("      Карта exports успешно пересобрана"));
  }

  console.log(`${cyan("[3/3]")} 💾 Запись финального манифеста...`);
  const distDir = path.join(projectRoot, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(distDir, "package.json"),
    JSON.stringify(rootPkg, null, 2),
    "utf-8",
  );

  const duration = Date.now() - startTime;
  console.log(
    `\n${green("✓")} ${bold("Clean package.json generated in dist/")} ${gray(`(${duration}ms)`)}\n`,
  );
} catch (e) {
  console.error(`\n${red("💥 Pack failed:")} ${e.message}\n`);
  process.exit(1);
}
