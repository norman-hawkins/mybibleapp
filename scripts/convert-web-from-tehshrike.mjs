import fs from "fs";
import path from "path";

const SOURCE_DIR = path.resolve(process.env.HOME, "world-english-bible/json");
const OUT_DIR = path.resolve("data/bible/WEB");

fs.mkdirSync(OUT_DIR, { recursive: true });

function isTextRow(row) {
  return row.type === "paragraph text" || row.type === "line text";
}

function normalizeBookSlug(slug) {
  return slug.toLowerCase().replace(/\s+/g, "");
}

function writeChapter(bookSlug, chapterNum, verseMap) {
  const verses = [...verseMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, t]) => ({ v, t: t.trim() }));

  const outBookDir = path.join(OUT_DIR, normalizeBookSlug(bookSlug));
  fs.mkdirSync(outBookDir, { recursive: true });

  const num = String(chapterNum).padStart(2, "0");
  const out = {
    book: bookSlug,
    chapter: chapterNum,
    verses,
  };

  fs.writeFileSync(path.join(outBookDir, `${num}.json`), JSON.stringify(out, null, 2));
}

const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const bookSlug = file.replace(/\.json$/, "");
  const rows = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), "utf8"));

  const byChapter = new Map();

  for (const row of rows) {
    if (!isTextRow(row)) continue;

    const c = row.chapterNumber;
    const v = row.verseNumber;
    const text = row.value ?? "";

    if (!byChapter.has(c)) byChapter.set(c, new Map());
    const verseMap = byChapter.get(c);

    verseMap.set(v, (verseMap.get(v) ?? "") + text);
  }

  for (const [chapterNum, verseMap] of byChapter.entries()) {
    writeChapter(bookSlug, chapterNum, verseMap);
  }
}

console.log("Done ✅ Wrote chapter files to data/bible/WEB");

