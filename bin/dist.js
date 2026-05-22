#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

try {
  console.log("🚀 Checking deployment status...");

  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;

  let existingVersion = null;
  try {
    execSync("git fetch origin __dist__", {
      cwd: projectRoot,
      stdio: "ignore",
    });

    const remotePkgContent = execSync("git show origin/__dist__:package.json", {
      cwd: projectRoot,
    })
      .toString()
      .trim();
    existingVersion = JSON.parse(remotePkgContent).version;
    console.log(`🔍 Existing version in remote __dist__: ${existingVersion}`);
  } catch (e) {
    console.log(
      "ℹ️ Remote branch __dist__ or package.json not found. Assuming first deploy.",
    );
  }

  if (existingVersion === version) {
    console.log(
      `ℹ️ Version ${version} is already deployed to origin/__dist__. Skipping.`,
    );
    process.exit(0);
  }

  console.log(
    `📦 Version bump detected (${existingVersion || "none"} -> ${version}). Building...`,
  );

  const currentBranch = execSync("git branch --show-current", {
    cwd: projectRoot,
  })
    .toString()
    .trim();

  execSync("npm run build", { stdio: "inherit", cwd: projectRoot });
  const distPath = path.join(projectRoot, "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error("Folder 'dist' not found after build.");
  }

  execSync("git checkout -B __dist__", { cwd: projectRoot });

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
    const currentBranch = execSync("git branch --show-current", {
      cwd: projectRoot,
    })
      .toString()
      .trim();
    if (currentBranch !== "main")
      execSync("git checkout main", { cwd: projectRoot });
  } catch {}
  process.exit(1);
}
