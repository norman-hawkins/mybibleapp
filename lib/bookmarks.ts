import AsyncStorage from "@react-native-async-storage/async-storage";

export type Bookmark = {
  id: string;          // e.g. "john-03-16"
  book: string;        // slug, e.g. "john"
  chapter: number;
  verse: number;
  text: string;
  createdAt: number;
};

const KEY = "bookmarks:v1";

export async function listBookmarks(): Promise<Bookmark[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

export async function isBookmarked(id: string): Promise<boolean> {
  const all = await listBookmarks();
  return all.some((b) => b.id === id);
}

export async function addBookmark(b: Bookmark): Promise<void> {
  const all = await listBookmarks();
  if (all.some((x) => x.id === b.id)) return;
  all.unshift(b);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function removeBookmark(id: string): Promise<void> {
  const all = await listBookmarks();
  const next = all.filter((b) => b.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export function makeBookmarkId(book: string, chapter: number, verse: number) {
  return `${book}-${String(chapter).padStart(2, "0")}-${String(verse).padStart(2, "0")}`;
}
