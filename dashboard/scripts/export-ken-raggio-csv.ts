import crypto from "crypto";
import fs from "fs";
import path from "path";

const SOURCE_KEY = "ken_raggio";

/**
 * Convert filename → book slug
 * e.g. "1chronicles.txt" → "1chronicles"
 */
function slugFromFilename(filename: string) {
  return filename.replace(/\.txt$/i, "").trim().toLowerCase();
}

function stableHash(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 12);
}

/**
 * Anchor examples:
 *   John 1:49
 *   John 1:26-27,33
 */
const anchorLineRe = /^(.+?)\s+(\d+):([0-9,\-\s]+)\s*(?:-|—)?\s*(.*)$/i;
const extraVerseRe = /\bV\.\s*(\d+)\b/gi;

function parseVersePart(versePartRaw: string) {
  const vRaw = versePartRaw.replace(/\s+/g, "");
  const anchors: number[] = [];

  // range: 26-27
  if (vRaw.includes("-")) {
    const [a, b] = vRaw.split("-").map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        verseStart: Math.min(a, b),
        verseEnd: Math.max(a, b),
        anchors: [],
      };
    }
  }

  // list: 26,27,33
  if (vRaw.includes(",")) {
    vRaw.split(",").forEach((x) => {
      const n = Number(x);
      if (Number.isFinite(n)) anchors.push(n);
    });
    if (anchors.length) {
      return {
        verseStart: Math.min(...anchors),
        verseEnd: Math.max(...anchors),
        anchors,
      };
    }
  }

  // single verse
  const single = Number(vRaw);
  if (Number.isFinite(single)) {
    return { verseStart: single, verseEnd: single, anchors: [single] };
  }

  return { verseStart: null as any, verseEnd: null as any, anchors: [] };
}

function splitIntoSections(text: string) {
  const lines = text.split(/\r?\n/);
  const sections: { anchor: string; lines: string[] }[] = [];

  let current: { anchor: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const isAnchor = anchorLineRe.test(trimmed);

    if (isAnchor) {
      if (current) sections.push(current);
      current = { anchor: trimmed, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);
  return sections;
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, `""`)}"`;
  return s;
}

async function main() {
  const inputDir = path.join(process.cwd(), "scripts", "ken-raggio");
  const outPath = path.join(process.cwd(), "scripts", "ken-raggio.csv");

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith(".txt"));

  if (!files.length) {
    console.error("No .txt files found in:", inputDir);
    process.exit(1);
  }

  // timestamp fields are NOT NULL in your table, so include them in the CSV
  const nowIso = new Date().toISOString();

  // IMPORTANT:
  // Keep column order stable and explicit, matching your DB columns you plan to import into.
  const header = [
    "id",
    "sourceKey",
    "book",
    "chapterStart",
    "chapterEnd",
    "verseStart",
    "verseEnd",
    "anchorsJson",
    "heading",
    "content",
    "anchorRaw",
    "orderIndex",
    "createdAt",
    "updatedAt",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const file of files) {
    const book = slugFromFilename(file);
    const raw = fs.readFileSync(path.join(inputDir, file), "utf8");
    const sections = splitIntoSections(raw);

    let orderIndex = 0;

    for (const sec of sections) {
      orderIndex += 1;

      const m = sec.anchor.match(anchorLineRe);
      if (!m) continue;

      const chap = Number(m[2]);
      const versePart = m[3];
      if (!Number.isFinite(chap)) continue;

      const { verseStart, verseEnd, anchors } = parseVersePart(versePart);

      // Extra "V. 32" references in anchor line
      const extra: number[] = [];
      let mm: RegExpExecArray | null;
      while ((mm = extraVerseRe.exec(sec.anchor))) {
        const v = Number(mm[1]);
        if (Number.isFinite(v)) extra.push(v);
      }

      const allAnchors = Array.from(new Set([...anchors, ...extra])).map((v) => ({
        chapter: chap,
        verse: v,
      }));

      // Heading = first non-empty line
      const bodyLines = sec.lines;
      const headingLineIndex = bodyLines.findIndex((l) => l.trim().length > 0);

      const heading = headingLineIndex >= 0 ? bodyLines[headingLineIndex].trim() : "Notes";

      const content = bodyLines
        .slice(headingLineIndex + 1)
        .join("\n")
        .trim();

      if (!content) continue;

      /**
       * ✅ EXACT SAME NORMALIZATION AS YOUR "STABLE" IMPORTER:
       * - verse 0 → null
       * - chapter-level entries have both null
       * NOTE: this can produce vs=null + ve=3 if your source had verseStart=0 and verseEnd=3.
       * (Keeping it identical to your importer as requested.)
       */
      const vsRaw =
        typeof verseStart === "number" && Number.isFinite(verseStart) ? verseStart : null;

      const veRaw =
        typeof verseEnd === "number" && Number.isFinite(verseEnd) ? verseEnd : null;

      const vs = vsRaw && vsRaw > 0 ? vsRaw : null;
      const ve = veRaw && veRaw > 0 ? veRaw : null;

      /**
       * ✅ Stable ID (same seed as importer)
       */
      const idSeed = `${SOURCE_KEY}:${book}:${chap}:${vs ?? "c"}:${ve ?? "c"}:${heading}:${stableHash(
        content
      )}`;
      const id = `kr_${stableHash(idSeed)}`;

      const anchorsJson = allAnchors.length ? JSON.stringify(allAnchors) : null;

      const row = [
        csvEscape(id),
        csvEscape(SOURCE_KEY),
        csvEscape(book),
        csvEscape(chap),
        csvEscape(chap),
        csvEscape(vs),
        csvEscape(ve),
        csvEscape(anchorsJson),
        csvEscape(heading),
        csvEscape(content),
        csvEscape(sec.anchor),
        csvEscape(orderIndex),
        csvEscape(nowIso),
        csvEscape(nowIso),
      ].join(",");

      lines.push(row);
    }

    console.log(`Prepared ${book} (${sections.length} sections)`);
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log("✅ Wrote:", outPath);
  console.log("Next: import this CSV into SourceSegment (be careful to map columns by NAME, not by position).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});