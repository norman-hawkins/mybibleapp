import fs from "fs";
import path from "path";

const ROOT = path.resolve("data/commentary/MHCC");

const pad2 = (n) => String(n).padStart(2, "0");
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

const books = fs.readdirSync(ROOT).filter((name) => isDir(path.join(ROOT, name)));

let out = [];
out.push("/* AUTO-GENERATED. Do not edit by hand. */");
out.push("export const MHCC: Record<string, Record<string, any>> = {");

for (const book of books.sort()) {
  const bookDir = path.join(ROOT, book);
  const files = fs.readdirSync(bookDir).filter((f) => f.endsWith(".json")).sort();

  out.push(`  "${book}": {`);

  for (const f of files) {
    const n = Number(f.replace(".json", ""));
    if (!Number.isFinite(n)) continue;
    const key = pad2(n);

    const p1 = path.join(bookDir, `${key}.json`);
    const p2 = path.join(bookDir, `${n}.json`);
    const use = isFile(p1) ? `./${book}/${key}.json` : `./${book}/${n}.json`;

    out.push(`    "${key}": require("${use}"),`);
  }

  if (out[out.length - 1].endsWith(",")) out[out.length - 1] = out[out.length - 1].replace(/,\s*$/, "");
  out.push("  },");
}

if (out[out.length - 1].endsWith(",")) out[out.length - 1] = out[out.length - 1].replace(/,\s*$/, "");
out.push("};");
out.push("");

fs.writeFileSync(path.join(ROOT, "index.ts"), out.join("\n"), "utf8");
console.log("✅ Wrote data/commentary/MHCC/index.ts");
