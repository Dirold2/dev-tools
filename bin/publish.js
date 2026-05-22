#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const projectRoot = process.cwd();
const distPath = path.join(projectRoot, "dist");

try {
  console.log("🚀 Подготовка билда...");
  execSync("npm run build", { stdio: "inherit", cwd: projectRoot });

  console.log("📦 Публикация в NPM...");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Папка 'dist' не найдена по пути: ${distPath}. Убедись, что сборка прошла успешно.`,
    );
  }

  execSync("npm publish --access public", { cwd: distPath, stdio: "inherit" });

  console.log("✅ Успешно опубликовано!");
} catch (e) {
  console.error("❌ Ошибка при публикации:", e.message);
  process.exit(1);
}
