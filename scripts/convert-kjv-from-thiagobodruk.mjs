// scripts/convert-kjv-from-thiagobodruk.mjs
// Converts thiagobodruk/bible en_kjv.json into:
// data/bible/KJV/<book>/<01..>.json
// Handles UTF-8 BOM safely

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const inFile = path.join(ROOT, "bible/json/en_kjv.json");
const outRoot = path.join(ROOT, "data/bible/KJV");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function slugifyBook(b) {
  return String(b)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// ---- READ FILE WITH BOM STRIP ----
if (!fs.existsSync(inFile)) {
  console.error("❌ Missing:", inFile);
  process.exit(1);
}

let text = fs.readFileSync(inFile, "utf8");

// Strip UTF-8 BOM if present
if (text.charCodeAt(0) === 0xfeff) {
  text = text.slice(1);
}

let raw;
try {
  raw = JSON.parse(text);
} catch (e) {
  console.error("❌ JSON parse failed even after BOM removal");
  throw e;
}

// ---- CONVERT ----
// thiagobodruk format:
// [ { abbrev, chapters: [ [v1,v2...], [v1,v2...] ], name } ]

let totalChapters = 0;

for (const book of raw) {
  const bookSlug = slugifyBook(book.name);
  const bookDir = path.join(outRoot, bookSlug);
  ensureDir(bookDir);

  book.chapters.forEach((versesArr, idx) => {
    const chapterNum = idx + 1;

    const verses = versesArr.map((t, i) => ({
      v: i + 1,
      t: String(t).trim(),
    }));

    const out = {
      book: bookSlug,
      chapter: chapterNum,
      verses,
    };

    const outFile = path.join(bookDir, `${pad2(chapterNum)}.json`);
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");
    totalChapters++;
  });
}

console.log(`✅ KJV conversion complete`);
console.log(`✅ Chapters written: ${totalChapters}`);
console.log(`✅ Output: data/bible/KJV`);
console.log(`Example: data/bible/KJV/john/01.json`);
