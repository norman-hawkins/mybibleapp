import fs from "fs";
import path from "path";

const ROOT = path.resolve("data/bible/KJV_STRONGS");
const OUT = path.resolve("data/bible/KJV_STRONGS/index.ts");

const books = fs
  .readdirSync(ROOT)
  .filter((x) => fs.statSync(path.join(ROOT, x)).isDirectory());

const lines = [];
lines.push("/* Auto-generated. Do not edit. */");
lines.push("export const KJV_STRONGS = {");

for (const book of books) {
  const dir = path.join(ROOT, book);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  lines.push(`  "${book}": {`);
  for (const f of files) {
    const ch = String(parseInt(f.replace(".json", ""), 10));
    lines.push(`    "${ch}": require("./${book}/${f}"),`);
  }
  lines.push("  },");
}

lines.push("} as const;");
lines.push("");

fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log("✅ Wrote data/bible/KJV_STRONGS/index.ts");

