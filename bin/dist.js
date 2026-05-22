#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

import path from "node:path";

const projectRoot = process.cwd();

try {
  console.log("🚀 Deploying build to __dist__...");

  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8"),
  );
  const version = pkg.version;
  console.log(`📦 Building version ${version}...`);

  execSync("npm run build", { stdio: "inherit", cwd: projectRoot });
  const distPath = path.join(projectRoot, "dist");

  const currentBranch = execSync("git branch --show-current", {
    cwd: projectRoot,
  })
    .toString()
    .trim();

  execSync("git checkout -B __dist__", { cwd: projectRoot });

  let existingVersion = null;
  const distPkgPath = path.join(projectRoot, "package.json");

  if (fs.existsSync(distPkgPath)) {
    try {
      const content = fs.readFileSync(distPkgPath, "utf-8");
      existingVersion = JSON.parse(content).version;
      console.log(`🔍 Existing version in __dist__: ${existingVersion}`);
    } catch (e) {
      console.log("⚠️ Could not parse existing package.json in __dist__");
    }
  }

  console.log(
    `⚖️ Comparing: ${existingVersion} (existing) vs ${version} (new)`,
  );

  if (existingVersion === version) {
    console.log(`ℹ️ Versions match. Skipping.`);
    execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
    process.exit(0);
  }

  console.log("🧹 Cleaning root directory...");
  const files = fs.readdirSync(projectRoot);
  for (const file of files) {
    if (![".git", "node_modules", ".gitignore"].includes(file)) {
      fs.rmSync(path.join(projectRoot, file), { recursive: true, force: true });
    }
  }

  execSync(`cp -r ${distPath}/* ${projectRoot}`);

  execSync("git add -f .", { cwd: projectRoot });
  execSync(`git commit -m "chore: release v${version}"`, { cwd: projectRoot });
  execSync("git push origin __dist__ --force", { cwd: projectRoot });

  console.log(`✅ Branch __dist__ updated to v${version}!`);

  execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
} catch (e) {
  console.error("❌ Deploy failed:", e.message);
  try {
    execSync("git checkout main", { cwd: projectRoot });
  } catch {}
  process.exit(1);
}
