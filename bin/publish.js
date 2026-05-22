#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const bold = (txt) => `\x1b[1m${txt}\x1b[0m`;
const green = (txt) => `\x1b[32m${txt}\x1b[0m`;
const cyan = (txt) => `\x1b[36m${txt}\x1b[0m`;
const gray = (txt) => `\x1b[90m${txt}\x1b[0m`;
const red = (txt) => `\x1b[31m${txt}\x1b[0m`;

const startTime = Date.now();
const projectRoot = process.cwd();
const distPath = path.join(projectRoot, "dist");

console.log(`\n● ${bold("dirold-dev-tools")} ${gray("publish v1.0.0")}\n`);

try {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json не найден в директории: ${projectRoot}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const pkgName = pkg.name || "unknown-package";

  console.log(`${cyan("[1/2]")} 📦 Сборка дистрибутива...`);
  execSync("npm run build", { stdio: "ignore", cwd: projectRoot });

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Папка 'dist' не найдена по пути: ${distPath}. Сборка завершилась некорректно.`,
    );
  }

  console.log(`${cyan("[2/2]")} 🚀 Публикация в реестр NPM...`);
  console.log(gray("────────────────────────────────────────────────────────"));
  execSync("npm publish --access public", { cwd: distPath, stdio: "inherit" });
  console.log(gray("────────────────────────────────────────────────────────"));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${green("✓ Пакет успешно опубликован!")}`);
  console.log(
    gray("┌────────────────────────────────────────────────────────┐"),
  );
  console.log(
    `│ ${bold("● Registry Details")}                                    │`,
  );
  console.log(`│                                                        │`);
  console.log(`│  ${bold("Package:")}  ${cyan(pkgName.padEnd(41))} │`);
  console.log(`│  ${bold("Version:")}  ${green(version.padEnd(41))} │`);
  console.log(`│  ${bold("Access:")}   ${"public".padEnd(41)} │`);
  console.log(`│  ${bold("Registry:")} ${"npmjs.com".padEnd(41)} │`);
  console.log(`│  ${bold("Duration:")} ${`${duration}s`.padEnd(41)} │`);
  console.log(
    gray("└────────────────────────────────────────────────────────┘\n"),
  );
} catch (e) {
  console.error(`\n${red("💥 Publish failed:")} ${e.message}\n`);
  process.exit(1);
}
