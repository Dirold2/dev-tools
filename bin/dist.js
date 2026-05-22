#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ANSI-цвета для терминала
const bold = (txt) => `\x1b[1m${txt}\x1b[0m`;
const green = (txt) => `\x1b[32m${txt}\x1b[0m`;
const cyan = (txt) => `\x1b[36m${txt}\x1b[0m`;
const gray = (txt) => `\x1b[90m${txt}\x1b[0m`;
const yellow = (txt) => `\x1b[33m${txt}\x1b[0m`;
const red = (txt) => `\x1b[31m${txt}\x1b[0m`;

const projectRoot = process.cwd();
let currentBranch = "main";
const startTime = Date.now();

console.log(`\n● ${bold("dirold-dev-tools")} ${gray("dist v1.0.0")}\n`);

try {
  console.log(`${cyan("[1/5]")} 🔍 Анализ окружения...`);
  try {
    currentBranch = execSync("git branch --show-current", { cwd: projectRoot })
      .toString()
      .trim();
  } catch (e) {}

  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const pkgName = pkg.name || "unknown-package";

  console.log(
    `${cyan("[2/5]")} 📝 Синхронизация ветки ${bold(currentBranch)}...`,
  );
  const hasMainChanges = execSync("git status --porcelain", {
    cwd: projectRoot,
  })
    .toString()
    .trim();

  if (hasMainChanges) {
    execSync("git add .", { cwd: projectRoot });
    execSync(`git commit -m "v${version}"`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
    console.log(`      ${green("✓")} Создан коммит с версией ${bold(version)}`);
  }

  execSync(`git push origin ${currentBranch} --follow-tags`, {
    cwd: projectRoot,
    stdio: "ignore",
  });
  console.log(
    `      ${green("✓")} Ветка ${bold(currentBranch)} отправлена в origin`,
  );

  console.log(
    `${cyan("[3/5]")} ⚙️ Проверка статуса деплоя в ${bold("__dist__")}...`,
  );
  let existingVersion = null;
  try {
    execSync("git fetch origin __dist__", {
      cwd: projectRoot,
      stdio: "ignore",
    });
    const remotePkgContent = execSync("git show origin/__dist__:package.json", {
      cwd: projectRoot,
      stdio: "pipe",
    })
      .toString()
      .trim();
    existingVersion = JSON.parse(remotePkgContent).version;
  } catch (e) {}

  if (existingVersion === version) {
    console.log(
      `\n${yellow("ℹ Информация:")} Версия ${bold(version)} уже развернута в origin/__dist__. Пропуск.`,
    );
    process.exit(0);
  }

  console.log(`${cyan("[4/5]")} 📦 Сборка дистрибутива...`);
  console.log(gray("      ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 40% [tsc]"));

  execSync("npm run build", { stdio: "ignore", cwd: projectRoot });
  const distPath = path.join(projectRoot, "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error("Директория 'dist' не найдена после компиляции.");
  }
  console.log(
    gray("      ■■■■■■■■■─■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 80% [package.json]"),
  );

  console.log(`${cyan("[5/5]")} 🚀 Публикация в ветку ${bold("__dist__")}...`);
  execSync("git checkout -B __dist__", { cwd: projectRoot, stdio: "ignore" });

  const files = fs.readdirSync(projectRoot);
  for (const file of files) {
    if (![".git", "node_modules", ".gitignore", "dist"].includes(file)) {
      fs.rmSync(path.join(projectRoot, file), { recursive: true, force: true });
    }
  }

  fs.writeFileSync(
    path.join(projectRoot, ".gitignore"),
    "node_modules/\n",
    "utf-8",
  );
  execSync(`cp -r ${distPath}/. ${projectRoot}`);
  fs.rmSync(distPath, { recursive: true, force: true });

  try {
    execSync("git rm -r --cached node_modules", {
      cwd: projectRoot,
      stdio: "ignore",
    });
  } catch (e) {}

  execSync("git add .", { cwd: projectRoot });

  const hasDistChanges = execSync("git status --porcelain", {
    cwd: projectRoot,
  })
    .toString()
    .trim();
  if (hasDistChanges) {
    execSync(`git commit -m "chore: release v${version}"`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
    execSync("git push origin __dist__ --force", {
      cwd: projectRoot,
      stdio: "ignore",
    });
  }

  console.log(
    gray("      ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 100% [done]"),
  );

  execSync(`git checkout ${currentBranch}`, {
    cwd: projectRoot,
    stdio: "ignore",
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${green("✓ Deployment Successful!")}`);
  console.log(
    gray("┌────────────────────────────────────────────────────────┐"),
  );
  console.log(
    `│ ${bold("● Project Details")}                                      │`,
  );
  console.log(`│                                                        │`);
  console.log(`│  ${bold("Package:")}  ${cyan(pkgName.padEnd(41))} │`);
  console.log(`│  ${bold("Version:")}  ${green(version.padEnd(41))} │`);
  console.log(`│  ${bold("Source:")}   ${currentBranch.padEnd(41)} │`);
  console.log(`│  ${bold("Target:")}   ${"__dist__ (GitHub)".padEnd(41)} │`);
  console.log(`│  ${bold("Duration:")} ${`${duration}s`.padEnd(41)} │`);
  console.log(
    gray("└────────────────────────────────────────────────────────┘\n"),
  );
} catch (e) {
  console.error(`\n${red("💥 Deploy failed:")} ${e.message}`);
  try {
    execSync(`git checkout ${currentBranch}`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
  } catch {}
  process.exit(1);
}
