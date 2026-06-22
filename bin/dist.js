#!/usr/bin/env node
import { execSync } from "node:child_process";
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
  logWarn,
  summaryBox,
  fmtDuration,
  bold,
  green,
  cyan,
} from "../src/format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
);

const projectRoot = process.cwd();
const config = loadConfig(projectRoot);
let currentBranch = "main";
const startTime = Date.now();
const distBranch = config.dist?.distBranch ?? "__dist__";

logHeader(toolPkg.name, "dist", toolPkg.version);

try {
  logStep("Анализ окружения...");
  try {
    currentBranch = execSync("git branch --show-current", { cwd: projectRoot })
      .toString()
      .trim();
  } catch {}

  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const pkgName = pkg.name || "unknown-package";

  logStep(`Синхронизация ветки ${bold(currentBranch)}...`);
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
    logDetail(`✓ Создан коммит с версией ${bold(version)}`);
  }

  execSync(`git push origin ${currentBranch} --follow-tags`, {
    cwd: projectRoot,
    stdio: "ignore",
  });
  logDetail(`✓ Ветка ${bold(currentBranch)} отправлена в origin`);

  logStep(`Проверка статуса деплоя в ${bold(distBranch)}...`);
  let existingVersion = null;
  try {
    execSync(`git fetch origin ${distBranch}`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
    const content = execSync(`git show origin/${distBranch}:package.json`, {
      cwd: projectRoot,
      stdio: "pipe",
    })
      .toString()
      .trim();
    existingVersion = JSON.parse(content).version;
  } catch {}

  if (existingVersion === version) {
    logWarn(
      `Версия ${bold(version)} уже развернута в origin/${distBranch}. Пропуск.`,
    );
    process.exit(0);
  }

  logStep("Сборка дистрибутива...");
  logDetail("tsc...");
  const buildCmd = config.dist?.buildCommand ?? "npm run build";
  execSync(buildCmd, { stdio: "ignore", cwd: projectRoot });

  const distPath = path.join(projectRoot, "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error("Директория 'dist' не найдена после компиляции.");
  }
  logDetail("package.json...");

  logStep(`Публикация в ветку ${bold(distBranch)}...`);
  execSync(`git checkout -B ${distBranch}`, {
    cwd: projectRoot,
    stdio: "ignore",
  });

  for (const file of fs.readdirSync(projectRoot)) {
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
  } catch {}

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
    execSync(`git push origin ${distBranch} --force`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
  }

  logDetail("done");
  execSync(`git checkout ${currentBranch}`, {
    cwd: projectRoot,
    stdio: "ignore",
  });

  const dur = fmtDuration(Date.now() - startTime);
  logSuccess("Deployment Successful!");
  summaryBox("Project Details", [
    { label: "Package:", value: pkgName, color: cyan },
    { label: "Version:", value: version, color: green },
    { label: "Source:", value: currentBranch },
    { label: "Target:", value: `${distBranch} (GitHub)` },
    { label: "Duration:", value: dur },
  ]);
} catch (e) {
  logError(`Deploy failed: ${e.message}`);
  try {
    execSync(`git checkout ${currentBranch}`, {
      cwd: projectRoot,
      stdio: "ignore",
    });
  } catch {}
  process.exit(1);
}
