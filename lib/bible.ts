import { KJV } from "@/data/bible/KJV";
import { WEB } from "@/data/bible/WEB";

export type Translation = "WEB" | "KJV";
export type Verse = { v: number; t: string };
export type ChapterData = { book: string; chapter: number; verses: Verse[] };

export function loadChapter(book: string, chapter: number, translation: Translation = "WEB"): ChapterData | null {
  const num = String(chapter).padStart(2, "0");
  const src = translation === "KJV" ? (KJV as any) : (WEB as any);
  return src?.[book]?.[num] ?? null;
}
