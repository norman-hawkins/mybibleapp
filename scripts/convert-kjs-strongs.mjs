// scripts/convert-kjs-strongs.mjs
// Properly converts KJS packed Strong's DB (MAPS/WORDS) into a flat dictionary
// keyed by Strong's codes ("G3056", "H7225").
//
// Output: data/strongs/strongs.json

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const inDir = path.join(ROOT, "data/strongs/kjs");
const outFile = path.join(ROOT, "data/strongs/strongs.json");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function norm(code) {
  if (!code) return null;
  let s = String(code).trim().toUpperCase();

  // common: "G03056" -> "G3056"
  const m0 = s.match(/^([GH])0+(\d+)$/);
  if (m0) return `${m0[1]}${Number(m0[2])}`;

  // if it’s already G#### / H####
  if (/^[GH]\d+$/.test(s)) return s;

  // sometimes maps might include "g3056"
  if (/^[gh]\d+$/.test(s)) return s.toUpperCase();

  return s;
}

function merge(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const sv = String(v).trim();
    if (!sv) continue;
    if (!dst[k] || !String(dst[k]).trim()) dst[k] = v;
  }
  return dst;
}

function normalizeEntryLike(r, code, sourceName) {
  if (!r) return { code, _src: sourceName };

  if (typeof r === "object" && !Array.isArray(r)) {
    return {
      code,
      lemma: r.lemma ?? r.word ?? r.lex ?? r[0],
      transliteration: r.transliteration ?? r.translit ?? r.xlit ?? r[1],
      pronunciation: r.pronunciation ?? r.pron ?? r.ipa ?? r[2],
      gloss: r.gloss ?? r.kjv_def ?? r.short_def ?? r.brief ?? r[3],
      definition: r.definition ?? r.strongs_def ?? r.desc ?? r.long_def ?? r[4],
      derivation: r.derivation ?? r.root ?? r[5],
      _src: sourceName,
    };
  }

  if (Array.isArray(r)) {
    return {
      code,
      lemma: r[0],
      transliteration: r[1],
      pronunciation: r[2],
      gloss: r[3],
      definition: r[4],
      derivation: r[5],
      _src: sourceName,
    };
  }

  if (typeof r === "string") {
    return { code, definition: r, _src: sourceName };
  }

  return { code, _src: sourceName };
}

function ingestPacked(map, raw, sourceName) {
  // Expect { MAPS: {G3056: idx,...}, WORDS: [...] }
  const MAPS = raw?.MAPS;
  const WORDS = raw?.WORDS;

  // If it’s already keyed by codes, support it too
  if (!WORDS && raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of Object.keys(raw)) {
      if (k === "MAPS" || k === "WORDS") continue;
      const code = norm(k);
      if (!code) continue;
      const entry = map[code] ?? { code };
      merge(entry, normalizeEntryLike(raw[k], code, sourceName));
      map[code] = entry;
    }
    return;
  }

  if (!MAPS || !WORDS) return;

  // Case: WORDS is object keyed by code
  if (WORDS && typeof WORDS === "object" && !Array.isArray(WORDS)) {
    for (const k of Object.keys(WORDS)) {
      const code = norm(k);
      if (!code) continue;
      const entry = map[code] ?? { code };
      merge(entry, normalizeEntryLike(WORDS[k], code, sourceName));
      map[code] = entry;
    }
    return;
  }

  // Case: WORDS is array and MAPS maps code -> numeric index
  if (Array.isArray(WORDS) && MAPS && typeof MAPS === "object") {
    for (const k of Object.keys(MAPS)) {
      const code = norm(k);
      if (!code) continue;

      const idx = MAPS[k];
      if (typeof idx !== "number") continue;

      const r = WORDS[idx];
      if (!r) continue;

      const entry = map[code] ?? { code };
      merge(entry, normalizeEntryLike(r, code, sourceName));
      map[code] = entry;
    }
  }
}

// ---- MAIN ----

const files = ["strong_dict.json", "strong_pure.json", "strong_name.json"]
  .map((f) => path.join(inDir, f))
  .filter((p) => fs.existsSync(p));

if (!files.length) {
  console.error("❌ No strong_*.json found in", inDir);
  process.exit(1);
}

const map = Object.create(null);

for (const fp of files) {
  const raw = readJson(fp);
  ingestPacked(map, raw, path.basename(fp));
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(map, null, 2), "utf8");

const keys = Object.keys(map);
console.log(`✅ Wrote ${outFile}`);
console.log(`✅ Entries: ${keys.length}`);
console.log("✅ Example keys:", keys.slice(0, 20));
console.log("✅ Has G3056?", !!map["G3056"]);
console.log("✅ Has H7225?", !!map["H7225"]);
