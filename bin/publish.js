#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/config.js";
import {
  logHeader,
  logStep,
  logDetail,
  logSuccess,
  logError,
  summaryBox,
  fmtDuration,
  green,
  cyan,
} from "../src/format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
);

const startTime = Date.now();
const projectRoot = process.cwd();
const config = loadConfig(projectRoot);
const distPath = path.join(projectRoot, "dist");

logHeader(toolPkg.name, "pack", toolPkg.version);

try {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json не найден в директории: ${projectRoot}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const pkgName = pkg.name || "unknown-package";

  logStep("Сборка дистрибутива...");
  execSync("npm run build", { stdio: "ignore", cwd: projectRoot });

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Папка 'dist' не найдена по пути: ${distPath}. Сборка завершилась некорректно.`,
    );
  }

  logStep("Публикация в реестр NPM...");
  logDetail("Проверка аутентификации...");
  try {
    execSync("npm whoami", { stdio: "ignore" });
  } catch {
    logDetail("Требуется аутентификация. Запуск npm login...");
    execSync("npm login", { stdio: "inherit" });
  }
  const access = config.publish?.access ?? "public";
  execSync(`npm publish --access ${access}`, {
    cwd: distPath,
    stdio: "inherit",
  });

  const dur = fmtDuration(Date.now() - startTime);
  logSuccess("Пакет успешно опубликован!");
  summaryBox("Registry Details", [
    { label: "Package:", value: pkgName, color: cyan },
    { label: "Version:", value: version, color: green },
    { label: "Access:", value: "public" },
    { label: "Registry:", value: "npmjs.com" },
    { label: "Duration:", value: dur },
  ]);
} catch (e) {
  logError(`Publish failed: ${e.message}`);
  process.exit(1);
}
