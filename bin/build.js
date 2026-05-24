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

console.log(`\n● ${bold(TOOL_NAME)} ${gray(`prep-dist v${TOOL_VERSION}`)}\n`);

try {
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json не найден в директории: ${projectRoot}`);
  }

  console.log(`${cyan("[1/3]")} 🧹 Очистка манифеста...`);
  const rootPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  const fieldsToOmit = [
    "scripts",
    "devDependencies",
    "jest",
    "eslintConfig",
    "files",
    "publishConfig",
    "private",
  ];

  for (const field of fieldsToOmit) {
    if (field in rootPkg) delete rootPkg[field];
  }

  rootPkg.private = false;

  console.log(`${cyan("[2/3]")} 🪛 Адаптация путей для dist/...`);

  const fixPath = (p) => {
    if (typeof p !== "string") return p;

    const clean = p.replace(/^dist\//, "").replace(/^\.?\/?/, "");
    return `./${clean}`;
  };

  const fieldsToFix = ["main", "types", "module", "typesVersions"];
  for (const field of fieldsToFix) {
    if (rootPkg[field]) rootPkg[field] = fixPath(rootPkg[field]);
  }

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
    console.log(
      gray(
        `    Экспорты пересобраны: ${Object.keys(rootPkg.exports).join(", ")}`,
      ),
    );
  }

  console.log(`${cyan("[3/3]")} 💾 Сохранение dist/package.json...`);
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
    `\n${green("✓")} ${bold("Dist manifest ready!")} ${gray(`(${duration}ms)`)}\n`,
  );
} catch (e) {
  console.error(`\n${red("💥 Build failed:")} ${e.message}\n`);
  process.exit(1);
}
