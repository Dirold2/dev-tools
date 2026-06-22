import fs from "node:fs";
import path from "node:path";

export const loadConfig = (root) => {
  try {
    const p = path.join(root, ".config_tools.json");
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
};
