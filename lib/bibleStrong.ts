import { KJV_STRONGS } from "@/data/bible/KJV_STRONGS";

export type Verse = { v: number; t: string };

export function loadStrongChapter(book: string, chapter: number) {
  const b = (KJV_STRONGS as any)[book];
  if (!b) return null;
  return b[String(chapter)] ?? null;
}

export function strongChapterCount(book: string) {
  const b = (KJV_STRONGS as any)[book];
  return b ? Object.keys(b).length : 0;
}
