import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "data/bible/KJV");
const OUT = path.join(BASE, "index.ts");

function walkBooks() {
  const books = fs.readdirSync(BASE).filter((d) => {
    const p = path.join(BASE, d);
    return fs.statSync(p).isDirectory();
  });

  const entries = [];
  for (const book of books) {
    const dir = path.join(BASE, book);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    const mapLines = files.map((f) => {
      const key = f.replace(".json", "");
      return `    "${key}": require("./${book}/${f}")`;
    });
    entries.push(`  "${book}": {\n${mapLines.join(",\n")}\n  }`);
  }
  return entries;
}

const content = `/* AUTO-GENERATED. Do not edit by hand. */
export const KJV: Record<string, Record<string, any>> = {
${walkBooks().join(",\n")}
};
`;

fs.writeFileSync(OUT, content, "utf8");
console.log("✅ Wrote", OUT);
