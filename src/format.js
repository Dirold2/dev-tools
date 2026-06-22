const noColor = !process.stdout.isTTY || process.env.NO_COLOR;

const s = (code, txt) => (noColor ? txt : `\x1b[${code}m${txt}\x1b[0m`);

export const bold = (txt) => s("1", txt);
export const dim = (txt) => s("2", txt);
export const green = (txt) => s("32", txt);
export const cyan = (txt) => s("36", txt);
export const gray = (txt) => s("90", txt);
export const red = (txt) => s("31", txt);
export const yellow = (txt) => s("33", txt);

export const logHeader = (name, subcommand, version) => {
  process.stdout.write(
    `▸ ${bold(name)} ${gray(`${subcommand} v${version}`)}\n`,
  );
};

export const logStep = (text) => {
  process.stderr.write(`  ▸  ${text}\n`);
};

export const logDetail = (text) => {
  process.stderr.write(`      ${gray(text)}\n`);
};

export const logSuccess = (text, durationMs) => {
  const dur =
    durationMs != null ? ` ${gray(`[${fmtDuration(durationMs)}]`)}` : "";
  process.stdout.write(`\n  ${green("✓")}  ${bold(text)}${dur}\n`);
};

export const logError = (text) => {
  process.stderr.write(`\n  ${red("✗")}  ${text}\n`);
};

export const logWarn = (text) => {
  process.stderr.write(`\n  ${yellow("△")}  ${text}\n`);
};

export const summaryBox = (title, rows) => {
  const maxLabel = Math.max(...rows.map((r) => r.label.length));
  const maxValue = Math.max(...rows.map((r) => r.value.length));
  const contentW = Math.max(48, maxLabel + maxValue + 7);
  const out = (s) => process.stdout.write(s + "\n");

  out(`│ ${bold(`● ${title}`)}${" ".repeat(contentW - title.length - 3)} │`);
  out(`│${" ".repeat(contentW)}│`);

  for (const { label, value, color } of rows) {
    const val = color ? color(value) : value;
    const line = `  ${label.padEnd(maxLabel)}  ${val.padEnd(maxValue)}   `;
    out(`│${line.padEnd(contentW)}│`);
  }

  out("");
};

export const fmtDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};
