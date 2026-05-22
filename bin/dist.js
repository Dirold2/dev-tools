#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
let currentBranch = "main";

try {
  try {
    currentBranch = execSync("git branch --show-current", { cwd: projectRoot })
      .toString()
      .trim();
  } catch (e) {
    //
  }

  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;

  const hasMainChanges = execSync("git status --porcelain", {
    cwd: projectRoot,
  })
    .toString()
    .trim();

  if (hasMainChanges) {
    console.log(`📝 Committing changes on ${currentBranch}...`);
    execSync("git add .", { cwd: projectRoot });
    execSync(`git commit -m "v${version}"`, { cwd: projectRoot });
  }

  console.log(`⬆️ Pushing ${currentBranch} and tags to origin...`);
  execSync(`git push origin ${currentBranch} --follow-tags`, {
    cwd: projectRoot,
  });

  console.log("🚀 Checking deployment status for __dist__...");
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
    `📦 Version bump detected (${existingVersion || "none"} -> ${version}). Building dist...`,
  );

  execSync("npm run build", { stdio: "inherit", cwd: projectRoot });
  const distPath = path.join(projectRoot, "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error("Folder 'dist' not found after build.");
  }

  execSync("git checkout -B __dist__", { cwd: projectRoot });

  console.log("🧹 Cleaning root directory...");
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
  } catch (e) {
    //
  }

  execSync("git add .", { cwd: projectRoot });

  const hasDistChanges = execSync("git status --porcelain", {
    cwd: projectRoot,
  })
    .toString()
    .trim();

  if (hasDistChanges) {
    execSync(`git commit -m "chore: release v${version}"`, {
      cwd: projectRoot,
    });
    execSync("git push origin __dist__ --force", { cwd: projectRoot });
    console.log(`✅ Branch __dist__ updated to v${version}!`);
  } else {
    console.log("ℹ️ No changes detected for __dist__ branch.");
  }

  execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
  console.log(`🎉 Deployment finished successfully! Back on ${currentBranch}.`);
} catch (e) {
  console.error("❌ Deploy failed:", e.message);
  try {
    execSync(`git checkout ${currentBranch}`, { cwd: projectRoot });
  } catch {}
  process.exit(1);
}
