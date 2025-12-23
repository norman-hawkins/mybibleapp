import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "data", "commentary", "MHCC");

// Basic OSIS/HTML-ish cleanup from diatheke output
function stripMarkup(s) {
  return (s || "")
    .replace(/<[^>]+>/g, "")           // remove tags
    .replace(/\s+/g, " ")             // collapse whitespace
    .replace(/\u00a0/g, " ")          // nbsp
    .trim();
}

// Parse “Verses 1-5” → { start:1, end:5, verses:[1..5] }
function parseRange(label) {
  const m = label.match(/Verses?\s+(\d+)\s*-\s*(\d+)/i);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  const verses = [];
  for (let v = start; v <= end; v++) verses.push(v);
  return { start, end, verses, range: `${start}-${end}` };
}

function chapterKey(ch) {
  return ch < 10 ? `0${ch}` : `${ch}`;
}

// Minimal list to get you started; expand later
const BOOKS = [
  { slug: "john", osis: "John", chapters: 21 },
  { slug: "matthew", osis: "Matt", chapters: 28 },
  { slug: "mark", osis: "Mark", chapters: 16 },
  { slug: "luke", osis: "Luke", chapters: 24 },
  { slug: "acts", osis: "Acts", chapters: 28 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const index = {};

for (const book of BOOKS) {
  index[book.slug] = {};
  const bookDir = path.join(OUT_DIR, book.slug);
  fs.mkdirSync(bookDir, { recursive: true });

  for (let ch = 1; ch <= book.chapters; ch++) {
    // diatheke output for whole chapter is usually "Book ch:1"
    const cmd = `diatheke -b MHCC -k "${book.osis} ${ch}:1"`;
    const raw = execSync(cmd, { encoding: "utf8" });

    // Example raw begins like:
    // "John 1:1: Verses 1-5 ... (MHCC)"
    const cleaned = stripMarkup(raw)
      .replace(/\(MHCC\)\s*$/i, "")
      .trim();

    // Extract the “Verses X-Y” label if present
    const rangeMatch = cleaned.match(/Verses?\s+\d+\s*-\s*\d+/i);
    const sections = [];

    if (rangeMatch) {
      const range = parseRange(rangeMatch[0]);

      // Remove leading "John 1:1:" portion if present
      const body = cleaned
        .replace(/^[A-Za-z]+\s+\d+:\d+:\s*/i, "")
        .trim();

      sections.push({
        range: range?.range ?? "1-1",
        verses: range?.verses ?? [1],
        text: body,
      });
    } else {
      // Fallback: store all as “all” if no range marker
      const body = cleaned.replace(/^[A-Za-z]+\s+\d+:\d+:\s*/i, "").trim();
      sections.push({ range: "all", verses: [], text: body });
    }

    const out = { book: book.slug, chapter: ch, sections };
    const file = path.join(bookDir, `${chapterKey(ch)}.json`);
    fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf8");

    index[book.slug][chapterKey(ch)] = `./${book.slug}/${chapterKey(ch)}.json`;
  }
}

// Build index.ts that uses require() just like your Bible index
let ts = `/* AUTO-GENERATED. Do not edit by hand. */\n`;
ts += `export const MHCC: Record<string, Record<string, any>> = {\n`;

for (const [slug, chapters] of Object.entries(index)) {
  ts += `  "${slug}": {\n`;
  for (const [chKey, rel] of Object.entries(chapters)) {
    ts += `    "${chKey}": require("${rel}"),\n`;
  }
  ts += `  },\n`;
}

ts += `};\n`;

fs.writeFileSync(path.join(OUT_DIR, "index.ts"), ts, "utf8");

console.log(`✅ Wrote commentary JSON + index.ts into ${OUT_DIR}`);
console.log(`✅ Example: data/commentary/MHCC/john/01.json`);
