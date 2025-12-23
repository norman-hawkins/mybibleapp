// lib/strongs.ts
export type StrongsEntry = {
  code: string; // "G3056" / "H7225" (or digits if dataset uses digits)
  lemma?: string;
  transliteration?: string;
  pronunciation?: string;
  gloss?: string;
  definition?: string;
  derivation?: string;
};

let _index: Record<string, StrongsEntry> | null = null;

function norm(code: string) {
  const s = (code || "").trim().toUpperCase();
  if (!s) return s;
  // collapse leading zeros like G03056 -> G3056
  const m0 = s.match(/^([GH])0+(\d+)$/);
  if (m0) return `${m0[1]}${Number(m0[2])}`;
  return s;
}

export function getStrongsEntry(code: string): StrongsEntry | null {
  if (!_index) {
    // IMPORTANT: static require (Metro needs this)
    _index = require("@/data/strongs/strongs.json");
  }

  const c = norm(code);
  if (_index[c]) return _index[c];

  // try padded form if your verse tags are G3056 but dict uses G03056
  const m = c.match(/^([GH])(\d+)$/);
  if (m) {
    const padded = `${m[1]}${m[2].padStart(5, "0")}`;
    if (_index[padded]) return _index[padded];
  }

  // if dict uses digits only
  const digits = c.replace(/^[GH]/, "");
  if (_index[digits]) return _index[digits];

  return null;
}
