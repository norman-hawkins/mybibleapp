import { MHCC } from "@/data/commentary/MHCC";

function chapterKey(ch: number) {
  return ch < 10 ? `0${ch}` : `${ch}`;
}

export type MHCCSection = {
  range?: string;        // e.g. "1-5"
  verses?: number[];     // e.g. [1,2,3,4,5]
  text: string;
};

export type MHCCChapter = {
  book: string;
  chapter: number;
  sections: MHCCSection[];
};

export function loadMHCCChapter(bookSlug: string, chapter: number): MHCCChapter | null {
  const key = chapterKey(chapter);
  const mod = (MHCC as any)?.[bookSlug]?.[key];
  return (mod?.default ?? mod) || null;
}

// ✅ This is the important part (verse-by-verse UX)
export function findMHCCForVerse(bookSlug: string, chapter: number, verse: number): MHCCSection | null {
  const ch = loadMHCCChapter(bookSlug, chapter);
  if (!ch?.sections?.length) return null;

  // Prefer exact “verses includes verse”
  const exact = ch.sections.find((s) => Array.isArray(s.verses) && s.verses.includes(verse));
  if (exact) return exact;

  // Fallback: parse "range" like "1-5"
  for (const s of ch.sections) {
    if (!s.range) continue;
    const m = String(s.range).match(/(\d+)\s*-\s*(\d+)/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (verse >= a && verse <= b) return s;
  }

  return null;
}