// scripts/repair-ken-raggio-verses.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SOURCE_KEY = "ken_raggio";

/**
 * Examples we need to handle:
 *  - Genesis 1:3 - "..."
 *  - Genesis 1:20,22 - "..."
 *  - John 1:1-2 - "..."
 *  - 1 Chronicles 9:1 - "..."
 *
 * This regex:
 *  - grabs last "<chapter>:<versePart>" on the line
 *  - avoids being confused by leading book numbers
 */
const anchorLineRe = /(\d+)\s*:\s*([0-9,\-\s]+)\s*(?:-|—)?/i;

function parseVersePart(versePartRaw: string) {
  const vRaw = (versePartRaw || "").replace(/\s+/g, "");
  if (!vRaw) return null;

  // range: 26-27
  if (vRaw.includes("-")) {
    const [a, b] = vRaw.split("-").map((x) => Number(x));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        verseStart: Math.min(a, b),
        verseEnd: Math.max(a, b),
        anchors: [] as number[],
      };
    }
    return null;
  }

  // list: 20,22,33
  if (vRaw.includes(",")) {
    const anchors: number[] = [];
    vRaw.split(",").forEach((x) => {
      const n = Number(x);
      if (Number.isFinite(n)) anchors.push(n);
    });
    if (!anchors.length) return null;
    return {
      verseStart: Math.min(...anchors),
      verseEnd: Math.max(...anchors),
      anchors,
    };
  }

  // single: 3
  const single = Number(vRaw);
  if (Number.isFinite(single)) {
    return { verseStart: single, verseEnd: single, anchors: [single] };
  }

  return null;
}

function norm(n: unknown): number | null {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return null;
  if (x < 1) return null;
  return Math.trunc(x);
}

function looksBroken(vs: any, ve: any) {
  // your CSV-import bug created things like (null, 3) or (null, 8) etc.
  if (vs === null && ve !== null) return true;
  if (vs !== null && ve === null) return true;
  if (vs === 0 || ve === 0) return true;
  return false;
}

async function main() {
  // Only rows likely broken, but keep anchorRaw non-empty so we can parse.
  const rows = await prisma.sourceSegment.findMany({
    where: {
      sourceKey: SOURCE_KEY,
      anchorRaw: { not: "" },
      OR: [
        { verseStart: null },
        { verseEnd: null },
        { verseStart: 0 as any },
        { verseEnd: 0 as any },
      ],
    },
    select: {
      id: true,
      book: true,
      chapterStart: true,
      verseStart: true,
      verseEnd: true,
      anchorRaw: true,
    },
    take: 250000,
  });

  console.log("Rows to repair:", rows.length);

  let updated = 0;

  // debug counters
  let skippedEmptyAnchor = 0;
  let skippedNoRegex = 0;
  let skippedNoParse = 0;
  let skippedBadNumbers = 0;
  let chapterMismatch = 0;

  const debugSamples: Array<{ id: string; reason: string; anchorRaw: string }> = [];

  for (const r of rows) {
    const raw = (r.anchorRaw ?? "").trim();
    if (!raw) {
      skippedEmptyAnchor += 1;
      if (debugSamples.length < 12) debugSamples.push({ id: r.id, reason: "EMPTY_ANCHOR", anchorRaw: String(r.anchorRaw) });
      continue;
    }

    const m = raw.match(anchorLineRe);
    if (!m) {
      skippedNoRegex += 1;
      if (debugSamples.length < 12) debugSamples.push({ id: r.id, reason: "NO_REGEX_MATCH", anchorRaw: raw });
      continue;
    }

    const chap = Number(m[1]);
    const versePart = m[2];

    const parsed = parseVersePart(versePart);
    if (!parsed) {
      skippedNoParse += 1;
      if (debugSamples.length < 12) debugSamples.push({ id: r.id, reason: "VERSEPART_PARSE_FAILED", anchorRaw: raw });
      continue;
    }

    const vs = norm(parsed.verseStart);
    const ve = norm(parsed.verseEnd);

    if (vs === null || ve === null || ve < vs) {
      skippedBadNumbers += 1;
      if (debugSamples.length < 12) debugSamples.push({ id: r.id, reason: `BAD_RANGE vs=${vs} ve=${ve}`, anchorRaw: raw });
      continue;
    }

    // We don't block on mismatch, just count it.
    if (Number.isFinite(Number(r.chapterStart)) && Number(r.chapterStart) !== chap) {
      chapterMismatch += 1;
    }

    // ✅ Critical fix:
    // if CSV created (verseStart=null, verseEnd=3) from "1:3", set vs=3 ve=3
    // We ALWAYS trust the anchorRaw versePart and overwrite the stored broken range.
    const anchorsJson =
      parsed.anchors?.length
        ? JSON.stringify(parsed.anchors.map((v) => ({ chapter: chap, verse: v })))
        : null;

    // Skip writing if it’s already correct (reduces noise)
    const already =
      r.verseStart === vs &&
      r.verseEnd === ve &&
      (anchorsJson === null ? r.anchorsJson === null : true);

    // But if it "looks broken", force update
    const force = looksBroken(r.verseStart, r.verseEnd);

    if (already && !force) continue;

    await prisma.sourceSegment.update({
      where: { id: r.id },
      data: {
        verseStart: vs,
        verseEnd: ve,
        anchorsJson,
      },
    });

    updated += 1;
    if (updated % 500 === 0) console.log("Updated so far:", updated);
  }

  console.log("✅ Done.");
  console.log({
    updated,
    skippedEmptyAnchor,
    skippedNoRegex,
    skippedNoParse,
    skippedBadNumbers,
    chapterMismatch,
  });

  if (debugSamples.length) {
    console.log("---- debug samples ----");
    for (const s of debugSamples) {
      console.log(`[${s.reason}] ${s.id}: ${s.anchorRaw}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});