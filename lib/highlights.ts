import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@bible_highlights";

/**
 * Highlight ID format:
 * book:chapter:verse
 * example: genesis:15:6
 */

export type Highlight = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  createdAt: number;
};

export async function getHighlights(): Promise<Record<string, Highlight>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function isHighlighted(id: string): Promise<boolean> {
  const highlights = await getHighlights();
  return Boolean(highlights[id]);
}

export async function addHighlight(h: Highlight) {
  const highlights = await getHighlights();
  highlights[h.id] = h;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
}

export async function removeHighlight(id: string) {
  const highlights = await getHighlights();
  delete highlights[id];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
}

export function makeHighlightId(
  book: string,
  chapter: number,
  verse: number
) {
  return `${book}:${chapter}:${verse}`;
}
