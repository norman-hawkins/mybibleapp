import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  GestureResponderEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { KJV } from "@/data/bible/KJV";
import { WEB } from "@/data/bible/WEB";
import { Verse } from "@/lib/bible";
import { prettyBook } from "@/lib/bibleBooks";
import { theme } from "@/lib/theme";

import {
  addHighlight,
  isHighlighted,
  makeHighlightId,
  removeHighlight,
} from "@/lib/highlights";

import { addBookmark, isBookmarked, removeBookmark } from "@/lib/bookmarks";


/* ================= CANON ================= */

const OLD_TESTAMENT = [
  "genesis","exodus","leviticus","numbers","deuteronomy",
  "joshua","judges","ruth","1samuel","2samuel","1kings","2kings",
  "1chronicles","2chronicles","ezra","nehemiah","esther","job","psalms",
  "proverbs","ecclesiastes","songofsolomon",
  "isaiah","jeremiah","lamentations","ezekiel","daniel",
  "hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk",
  "zephaniah","haggai","zechariah","malachi",
] as const;

const NEW_TESTAMENT = [
  "matthew","mark","luke","john","acts","romans",
  "1corinthians","2corinthians","galatians","ephesians","philippians","colossians",
  "1thessalonians","2thessalonians","1timothy","2timothy","titus","philemon",
  "hebrews","james","1peter","2peter","1john","2john","3john","jude","revelation",
] as const;

type Testament = "OT" | "NT";
type Anchor = { x: number; y: number; w: number; h: number } | null;
type BibleVersion = "WEB" | "KJV";

const PARAGRAPH_INDENT = "\u2003\u2003"; // two EM spaces

function chapterKey(ch: number) {
  return ch < 10 ? `0${ch}` : `${ch}`;
}

function hasBook(bible: any, slug: string) {
  return Boolean(bible?.[slug]);
}

function chapterCountFromBible(bible: any, slug: string) {
  return Object.keys(bible?.[slug] ?? {}).length;
}

function loadChapterFromBible(bible: any, slug: string, ch: number) {
  const key = chapterKey(ch);
  const mod = bible?.[slug]?.[key];
  return mod?.default ?? mod;
}

function chunkArray<T>(arr: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function makeRefId(version: BibleVersion, book: string, chapter: number, verse: number) {
  return `${version}:${book}:${chapter}:${verse}`;
}

/* ================= EXEGESIS TYPES + SOURCES ================= */

type ExegesisResult = {
  refId: string;
  version: BibleVersion;
  book: string;
  chapter: number;
  verse: number;

  summary: string;
  context?: string;
  keyTerms?: { term: string; meaning: string }[];
  crossRefs?: string[];

  source: {
    kind: "ai";
    name: string;
    license?: string;
    generatedAt?: number;
    url?: string;
  };
};

type ContributorRow = {
  id: string;
  content: string;
  updatedAt?: string;
  scope?: "VERSE" | "CHAPTER";
  author?: { name?: string | null; email?: string | null; role?: string | null };
};

type KenRow = {
  id: string;
  heading?: string | null;
  content: string;
  anchorRaw?: string | null;
  updatedAt?: string;
};

async function fetchKenExegesis(args: {
  book: string;
  chapter: number;
  verse: number;
}): Promise<{ ok: boolean; rows: KenRow[]; error?: string; triedUrl: string }> {
  const { book, chapter, verse } = args;

  const url = `${EXEGESIS_API_BASE}/api/exegesis/ken?book=${encodeURIComponent(
    book
  )}&chapter=${encodeURIComponent(String(chapter))}&verse=${encodeURIComponent(String(verse))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json: any = await res.json();
    return {
      ok: true,
      rows: Array.isArray(json?.rows) ? json.rows : [],
      triedUrl: url,
    };
  } catch (e: any) {
    return {
      ok: false,
      rows: [],
      error: e?.message ? String(e.message) : "Failed to load Ken exegesis",
      triedUrl: url,
    };
  }
}

const EXEGESIS_API_BASE =
  process.env.EXPO_PUBLIC_EXEGESIS_API_BASE ??
  process.env.EXPO_PUBLIC_BIBLE_API_BASE ??
  "https://mybibleapp.vercel.app";

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initialsFromName(name?: string | null, fallback?: string | null) {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/g).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase() || "U";
  }
  const e = (fallback ?? "").trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "U";
}

function displayName(row: ContributorRow) {
  const name = (row.author?.name ?? "").trim();
  if (name) return name;
  const email = (row.author?.email ?? "").trim();
  if (!email) return "Contributor";
  return email.split("@")[0] || "Contributor";
}

async function fetchApprovedContributorNotes(args: {
  book: string;
  chapter: number;
  verse: number;
}): Promise<{ ok: boolean; rows: ContributorRow[]; error?: string; triedUrl: string }> {
  const { book, chapter, verse } = args;

  // We fetch BOTH:
  // 1) Verse-specific commentary (verse=N)
  // 2) Chapter-level commentary (verse is null on the server; requested by omitting `verse`)
  // This fixes cases where there are multiple approved items relevant to a verse,
  // but one of them was written as a chapter note.
  const verseUrl = `${EXEGESIS_API_BASE}/api/commentary/verse?book=${encodeURIComponent(
    book
  )}&chapter=${encodeURIComponent(String(chapter))}&verse=${encodeURIComponent(String(verse))}`;

  const chapterUrl = `${EXEGESIS_API_BASE}/api/commentary/verse?book=${encodeURIComponent(
    book
  )}&chapter=${encodeURIComponent(String(chapter))}`;

  const triedUrl = `${verseUrl} (+ ${chapterUrl})`;

  async function fetchRows(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json: any = await res.json();
    return Array.isArray(json?.rows) ? json.rows : [];
  }

  try {
    const [verseRowsRaw, chapterRowsRaw] = await Promise.all([
      fetchRows(verseUrl),
      fetchRows(chapterUrl),
    ]);

    // Merge + de-dupe by id, and mark scope.
    const byId = new Map<string, any>();

    for (const r of verseRowsRaw) {
      const id = String(r?.id ?? "");
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, { ...r, __scope: "VERSE" });
    }

    for (const r of chapterRowsRaw) {
      const id = String(r?.id ?? "");
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, { ...r, __scope: "CHAPTER" });
    }

    // Safety: only show published rows in the mobile app UI.
    // (Server should already do this for anonymous users, but keep it locked here too.)
    const publishedOnly = Array.from(byId.values()).filter(
      (r: any) => String(r?.status ?? "").toUpperCase() === "PUBLISHED"
    );

    // Sort newest first (best UX if multiple notes exist)
    publishedOnly.sort((a: any, b: any) => {
      const ta = a?.updatedAt ? new Date(String(a.updatedAt)).getTime() : 0;
      const tb = b?.updatedAt ? new Date(String(b.updatedAt)).getTime() : 0;
      return tb - ta;
    });

    const rows: ContributorRow[] = publishedOnly.map((r: any) => ({
      id: String(r?.id ?? ""),
      content: String(r?.content ?? ""),
      updatedAt: r?.updatedAt ? String(r.updatedAt) : undefined,
      scope: (String(r?.__scope ?? "") as any) === "CHAPTER" ? "CHAPTER" : "VERSE",
      author: r?.author
        ? {
            name: r.author?.name ?? null,
            email: r.author?.email ?? null,
            role: r.author?.role ?? null,
          }
        : undefined,
    }));

    return { ok: true, rows, triedUrl };
  } catch (e: any) {
    return {
      ok: false,
      rows: [],
      error: e?.message ? String(e.message) : "Network error",
      triedUrl,
    };
  }
}

async function getCachedApprovedNotes(refId: string): Promise<ContributorRow[] | null> {
  const key = `exegesis:approved:${refId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedApprovedNotes(refId: string, rows: ContributorRow[]) {
  const key = `exegesis:approved:${refId}`;
  await AsyncStorage.setItem(key, JSON.stringify(rows));
}

// ✅ AI stub (wire later to your backend endpoint)
async function fetchAiExegesis(args: {
  version: BibleVersion;
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
}): Promise<ExegesisResult> {
  const { version, book, chapter, verse, verseText } = args;

  // Replace later with your API call.
  return {
    refId: makeRefId(version, book, chapter, verse),
    version,
    book,
    chapter,
    verse,
    summary: "AI exegesis is not connected yet.",
    context:
      "When you add your backend endpoint, this can generate verse-by-verse exegesis (Aura-style) and cache it.",
    keyTerms: verseText
      ? [{ term: "Verse Text", meaning: verseText.slice(0, 140) + (verseText.length > 140 ? "…" : "") }]
      : undefined,
    source: { kind: "ai", name: "AI Exegesis (Stub)", generatedAt: Date.now() },
  };
}

async function getCachedAiExegesis(refId: string): Promise<ExegesisResult | null> {
  const key = `exegesis:ai:${refId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedAiExegesis(refId: string, data: ExegesisResult) {
  const key = `exegesis:ai:${refId}`;
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

/* ================= SCREEN ================= */

export default function BibleScreen() {
  const params = useLocalSearchParams<{ book?: string; chapter?: string; verse?: string }>();
  const navigation = useNavigation();

  const [mode, setMode] = useState<"library" | "reader">("library");
  const [testament, setTestament] = useState<Testament>("NT");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const [version, setVersion] = useState<BibleVersion>("WEB");
  const activeBible = useMemo(() => (version === "KJV" ? KJV : WEB), [version]);

  const [bookSlug, setBookSlug] = useState("john");
  const [chapter, setChapter] = useState(3);
  const [verses, setVerses] = useState<Verse[]>([]);

  const [highlightedIds, setHighlightedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>(null);

  const [copiedVisible, setCopiedVisible] = useState(false);

  // Exegesis modal
  const [exegesisOpen, setExegesisOpen] = useState(false);

  const [hideUI, setHideUI] = useState(false);
  const lastYRef = useRef(0);

  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const TAB_BAR_BASE_STYLE: any = useMemo(
    () => ({
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 48,
      paddingBottom: 6,
      paddingTop: 6,
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
    }),
    []
  );

  /* ================= TTS ================= */

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate] = useState(1);
  const [speechPitch] = useState(1.2);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);

  const speakTokenRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const isQueueRunningRef = useRef(false);

  const normalizeForTTS = (s: string) =>
    (s || "")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .replace(/—/g, ", ")
      .replace(/–/g, ", ")
      .trim();

  const splitSentences = (text: string) => {
    const t = normalizeForTTS(text);
    const parts = t.split(/(?<=[\.\!\?\;\:])\s+/g);
    return parts.map((p) => p.trim()).filter(Boolean);
  };

  const stopSpeech = () => {
    speakTokenRef.current += 1;
    queueRef.current = [];
    isQueueRunningRef.current = false;
    Speech.stop();
    setIsSpeaking(false);
  };

  const runQueue = (token: number) => {
    if (token !== speakTokenRef.current) return;

    if (!queueRef.current.length) {
      isQueueRunningRef.current = false;
      setIsSpeaking(false);
      return;
    }

    const next = queueRef.current.shift()!;
    isQueueRunningRef.current = true;

    Speech.speak(next, {
      language: "en-US",
      voice: voiceId,
      rate: speechRate,
      pitch: speechPitch,
      onDone: () => setTimeout(() => runQueue(token), 140),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const english = voices.filter((v) => (v.language ?? "").startsWith("en"));

        const enhanced = english.find((v) =>
          /(enhanced|premium|neural)/i.test((v.quality ?? "") + " " + (v.name ?? ""))
        );

        const male = english.find((v) =>
          /(alex|daniel|oliver|tom|fred|male)/i.test((v.name ?? "") + " " + (v.identifier ?? ""))
        );

        const best = enhanced ?? male ?? english[0];
        setVoiceId(best?.identifier);
      } catch {
        setVoiceId(undefined);
      }
    })();

    return () => stopSpeech();
  }, []);

  const speakChapter = async () => {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking || isSpeaking) {
      stopSpeech();
      return;
    }
    if (!verses.length) return;

    setIsSpeaking(true);
    speakTokenRef.current += 1;
    const token = speakTokenRef.current;

    const chunks: string[] = [];
    chunks.push(`${prettyBook(bookSlug)}. Chapter ${chapter}.`);

    verses.forEach((v, idx) => {
      chunks.push(`Verse ${v.v}.`);
      chunks.push(...splitSentences(v.t));

      if (v.v % 7 === 0 && idx !== verses.length - 1) chunks.push("…");
    });

    queueRef.current = chunks;
    isQueueRunningRef.current = true;

    setTimeout(() => runQueue(token), 180);
  };

  const speakVerse = async (v: Verse) => {
    stopSpeech();
    setIsSpeaking(true);

    speakTokenRef.current += 1;
    const token = speakTokenRef.current;

    queueRef.current = [`${prettyBook(bookSlug)} ${chapter}. Verse ${v.v}.`, ...splitSentences(v.t)];
    setTimeout(() => runQueue(token), 80);
  };

  /* ================= BOOKS ================= */

  const otBooks = useMemo(
    () => OLD_TESTAMENT.filter((b) => hasBook(activeBible as any, b)),
    [activeBible]
  );
  const ntBooks = useMemo(
    () => NEW_TESTAMENT.filter((b) => hasBook(activeBible as any, b)),
    [activeBible]
  );
  const visibleBooks = testament === "OT" ? otBooks : ntBooks;

  const getTabsParent = () => {
    let p: any = (navigation as any).getParent?.();
    for (let i = 0; i < 6 && p; i++) {
      if (p?.setOptions) return p;
      p = p.getParent?.();
    }
    return null;
  };

  const setTabBarAnimated = (hidden: boolean) => {
    const parent: any = getTabsParent();
    if (!parent?.setOptions) return;

    parent.setOptions({
      tabBarStyle: [
        TAB_BAR_BASE_STYLE,
        { transform: [{ translateY: hidden ? 90 : 0 }], opacity: hidden ? 0 : 1 },
      ],
    });
  };

  const animateHideUI = () => {
    Animated.parallel([
      Animated.timing(headerTranslateY, { toValue: -90, duration: 220, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const animateShowUI = () => {
    Animated.parallel([
      Animated.timing(headerTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  // deep link / bookmark jump
  useEffect(() => {
    if (!params.book) return;

    const b = params.book;
    const ch = params.chapter ? Number(params.chapter) : 1;

    const inWEB = hasBook(WEB as any, b);
    const inKJV = hasBook(KJV as any, b);
    if (!inWEB && !inKJV) return;

    if (inWEB && !inKJV) setVersion("WEB");
    if (inKJV && !inWEB) setVersion("KJV");

    setBookSlug(b);
    setChapter(ch);

    if ((OLD_TESTAMENT as readonly string[]).includes(b)) setTestament("OT");
    if ((NEW_TESTAMENT as readonly string[]).includes(b)) setTestament("NT");

    setMode("reader");
  }, [params.book, params.chapter, params.verse]);

  // load chapter + highlights + saves
  useEffect(() => {
    if (mode !== "reader") return;

    const data = loadChapterFromBible(activeBible as any, bookSlug, chapter);
    const vs: Verse[] = data?.verses ?? [];
    setVerses(vs);

    (async () => {
      const hmap: Record<string, boolean> = {};
      const smap: Record<string, boolean> = {};

      for (const v of vs) {
        const id = makeHighlightId(bookSlug, chapter, v.v);
        hmap[id] = await isHighlighted(id);
        smap[id] = await isBookmarked(id);
      }

      setHighlightedIds(hmap);
      setSavedIds(smap);
    })();

    setHideUI(false);
    animateShowUI();
    setTabBarAnimated(false);

    setPopupOpen(false);
    setSelectedVerseId(null);
    setActiveVerse(null);
    setAnchor(null);

    lastYRef.current = 0;
    stopSpeech();
  }, [mode, bookSlug, chapter, activeBible]);

  useEffect(() => {
    if (mode === "library") {
      setHideUI(false);
      animateShowUI();
      setTabBarAnimated(false);
      stopSpeech();
    }
  }, [mode]);

  const openChapter = (slug: string, ch: number) => {
    setBookSlug(slug);
    setChapter(ch);
    setMode("reader");
  };

  const toggleBook = (slug: string) => setExpandedBook((prev) => (prev === slug ? null : slug));

  const closePopup = () => {
    setPopupOpen(false);
    setAnchor(null);
  };

  const openPopupForVerse = (v: Verse, e: GestureResponderEvent) => {
    const id = makeHighlightId(bookSlug, chapter, v.v);
    setSelectedVerseId(id);
    setActiveVerse(v);

    const { pageX, pageY } = e.nativeEvent;
    setAnchor({ x: pageX - 10, y: pageY - 10, w: 20, h: 20 });
    setPopupOpen(true);
  };

  const toggleHighlight = async () => {
    if (!activeVerse) return;

    const id = makeHighlightId(bookSlug, chapter, activeVerse.v);
    const currently = Boolean(highlightedIds[id]);

    if (currently) {
      await removeHighlight(id);
      setHighlightedIds((p) => ({ ...p, [id]: false }));
    } else {
      await addHighlight({ id, book: bookSlug, chapter, verse: activeVerse.v, createdAt: Date.now() });
      setHighlightedIds((p) => ({ ...p, [id]: true }));
    }

    closePopup();
  };

  const toggleSave = async () => {
    if (!activeVerse) return;

    const id = makeHighlightId(bookSlug, chapter, activeVerse.v);
    const currently = Boolean(savedIds[id]);

    if (currently) {
      await removeBookmark(id);
      setSavedIds((p) => ({ ...p, [id]: false }));
    } else {
      await addBookmark({
        id,
        book: bookSlug,
        chapter,
        verse: activeVerse.v,
        text: activeVerse.t,
        createdAt: Date.now(),
      });
      setSavedIds((p) => ({ ...p, [id]: true }));
    }

    closePopup();
  };

  const copyVerse = async () => {
    if (!activeVerse) return;

    const text = `${prettyBook(bookSlug)} ${chapter}:${activeVerse.v}\n${activeVerse.t}`;
    await Clipboard.setStringAsync(text);

    closePopup();
    setCopiedVisible(true);
    setTimeout(() => setCopiedVisible(false), 1400);
  };

  const openExegesis = () => {
    closePopup();
    setExegesisOpen(true);
  };

  const highlightLabel = useMemo(() => {
    if (!activeVerse) return "Highlight";
    const id = makeHighlightId(bookSlug, chapter, activeVerse.v);
    return highlightedIds[id] ? "Unhighlight" : "Highlight";
  }, [activeVerse, highlightedIds, bookSlug, chapter]);

  const saveLabel = useMemo(() => {
    if (!activeVerse) return "Save";
    const id = makeHighlightId(bookSlug, chapter, activeVerse.v);
    return savedIds[id] ? "Saved" : "Save";
  }, [activeVerse, savedIds, bookSlug, chapter]);

  const saveIcon = useMemo(() => {
    if (!activeVerse) return "bookmark-outline" as const;
    const id = makeHighlightId(bookSlug, chapter, activeVerse.v);
    return (savedIds[id] ? "bookmark" : "bookmark-outline") as const;
  }, [activeVerse, savedIds, bookSlug, chapter]);

  const isSavedActive = saveLabel === "Saved";

  const onReaderScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const lastY = lastYRef.current;

    const goingDown = y > lastY + 1;
    const goingUp = y < lastY - 1;

    if (goingDown && y > 10 && !hideUI) {
      setHideUI(true);
      animateHideUI();
      setTabBarAnimated(true);
    }

    if ((goingUp && hideUI) || (y < 16 && hideUI)) {
      setHideUI(false);
      animateShowUI();
      setTabBarAnimated(false);
    }

    lastYRef.current = y;
  };

  /* ================= READER ================= */

  if (mode === "reader") {
    const readerBg = (theme as any)?.reader?.background ?? theme.colors.background;
    const readerText = (theme as any)?.reader?.text ?? theme.colors.textPrimary;
    const readerVerseNumber = (theme as any)?.reader?.verseNumber ?? theme.colors.accent;
    const readerHeading = (theme as any)?.reader?.heading ?? theme.colors.textPrimary;
    const readerSub = (theme as any)?.reader?.subheading ?? theme.colors.textSecondary;

    return (
      <SafeAreaView style={[styles.safeReader, { backgroundColor: readerBg }]}>
        <Animated.View
          style={[
            styles.readerHeaderOverlay,
            { transform: [{ translateY: headerTranslateY }], opacity: headerOpacity },
          ]}
          pointerEvents={hideUI ? "none" : "auto"}
        >
          <View style={styles.readerTop}>
            <Pressable
              onPress={() => {
                setMode("library");
                setTabBarAnimated(false);
              }}
              style={({ pressed }) => [styles.backIconBtn, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
            </Pressable>

            <View style={styles.readerHeaderCenter}>
              <Text style={[styles.readerRef, { color: readerSub }]}>
                {prettyBook(bookSlug)} {chapter} • {version}
              </Text>
              <Text style={[styles.readerHeading, { color: readerHeading }]}>Chapter {chapter}</Text>
            </View>

            <Pressable
              onPress={speakChapter}
              style={({ pressed }) => [styles.audioBtn, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              <Ionicons
                name={isSpeaking ? "pause-circle-outline" : "play-circle-outline"}
                size={28}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.readerParagraphWrap, { paddingTop: hideUI ? 20 : 88 }]}
          showsVerticalScrollIndicator={false}
          onScroll={onReaderScroll}
          scrollEventThrottle={16}
        >
          {chunkArray(verses, 7).map((group, groupIndex) => (
            <Text key={groupIndex} style={[styles.readerParagraph, { color: readerText }]}>
              <Text>{PARAGRAPH_INDENT}</Text>

              {group.map((v, idx) => {
                const id = makeHighlightId(bookSlug, chapter, v.v);
                const highlighted = Boolean(highlightedIds[id]);
                const selected = selectedVerseId === id;

                return (
                  <Text
                    key={v.v}
                    onPress={(ev) => openPopupForVerse(v, ev)}
                    onLongPress={() => speakVerse(v)}
                    suppressHighlighting
                  >
                    <Text
                      style={[
                        styles.inlineVerseNumber,
                        { color: readerVerseNumber },
                        highlighted && styles.inlineHighlighted,
                        selected && styles.inlineSelectedUnderline,
                      ]}
                    >
                      {v.v}{" "}
                    </Text>

                    <Text
                      style={[
                        styles.inlineVerseText,
                        { color: readerText },
                        highlighted && styles.inlineHighlighted,
                        selected && styles.inlineSelectedUnderline,
                      ]}
                    >
                      {v.t}
                    </Text>

                    {idx < group.length - 1 ? " " : ""}
                  </Text>
                );
              })}
            </Text>
          ))}
        </ScrollView>

        <VersePopup
          visible={popupOpen}
          anchor={anchor}
          onClose={closePopup}
          highlightLabel={highlightLabel}
          onHighlight={toggleHighlight}
          saveLabel={saveLabel}
          saveIcon={saveIcon}
          saveActive={isSavedActive}
          onSave={toggleSave}
          onCopy={copyVerse}
          onRead={() => (activeVerse ? speakVerse(activeVerse) : undefined)}
          onAsk={closePopup}
          onNote={closePopup}
          onExegesis={openExegesis}
        />

        <ExegesisModal
          visible={exegesisOpen}
          onClose={() => setExegesisOpen(false)}
          version={version}
          book={bookSlug}
          chapter={chapter}
          verse={activeVerse?.v ?? 0}
          verseText={activeVerse?.t ?? ""}
        />

        {copiedVisible && (
          <View style={styles.copyToast}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.copyToastText}>Copied</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  /* ================= LIBRARY ================= */

  return (
    <SafeAreaView style={styles.safeLibrary}>
      <View style={styles.header}>
        <Text style={styles.title}>Bible</Text>
        <Text style={styles.subtitle}>Choose version, testament, then book and chapter</Text>

        <View style={styles.versionTabs}>
          <Pressable
            onPress={() => {
              setVersion("WEB");
              setExpandedBook(null);
            }}
            style={[styles.versionTab, version === "WEB" && styles.versionTabActive]}
          >
            <Text style={[styles.versionTabText, version === "WEB" && styles.versionTabTextActive]}>
              WEB
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setVersion("KJV");
              setExpandedBook(null);
            }}
            style={[styles.versionTab, version === "KJV" && styles.versionTabActive]}
          >
            <Text style={[styles.versionTabText, version === "KJV" && styles.versionTabTextActive]}>
              KJV
            </Text>
          </Pressable>
        </View>

        <View style={styles.testamentTabs}>
          <Pressable
            onPress={() => {
              setTestament("OT");
              setExpandedBook(null);
            }}
            style={[styles.testamentTab, testament === "OT" && styles.testamentTabActive]}
          >
            <Text style={[styles.testamentTabText, testament === "OT" && styles.testamentTabTextActive]}>
              Old Testament
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setTestament("NT");
              setExpandedBook(null);
            }}
            style={[styles.testamentTab, testament === "NT" && styles.testamentTabActive]}
          >
            <Text style={[styles.testamentTabText, testament === "NT" && styles.testamentTabTextActive]}>
              New Testament
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {visibleBooks.map((slug) => {
          const isOpen = expandedBook === slug;
          const count = chapterCountFromBible(activeBible as any, slug);
          const chapters = Array.from({ length: count }, (_, i) => i + 1);

          return (
            <View key={slug} style={styles.bookCard}>
              <Pressable onPress={() => toggleBook(slug)} style={styles.bookHeader}>
                <Text style={styles.bookName}>{prettyBook(slug)}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </Pressable>

              {isOpen && (
                <View style={styles.chapterGrid}>
                  {chapters.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => openChapter(slug, c)}
                      style={({ pressed }) => [styles.chapterChip, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.chapterText}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= EXEGESIS MODAL ================= */

function ExegesisModal({
  visible,
  onClose,
  version,
  book,
  chapter,
  verse,
  verseText,
}: {
  visible: boolean;
  onClose: () => void;
  version: BibleVersion;
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
}) {
  const [tab, setTab] = useState<"notes" | "ai">("notes");

  const [approvedRows, setApprovedRows] = useState<ContributorRow[]>([]);
  const [kenRows, setKenRows] = useState<KenRow[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesTriedUrl, setNotesTriedUrl] = useState<string | null>(null);
  const [ai, setAi] = useState<ExegesisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refId = useMemo(() => makeRefId(version, book, chapter, verse), [version, book, chapter, verse]);

  useEffect(() => {
    if (!visible) return;

    setTab("notes");
    setApprovedRows([]);
    setKenRows([]);
    setNotesError(null);
    setNotesTriedUrl(null);
    setAi(null);
    setNotesLoading(true);

    (async () => {
      try {
        if (!verse || !book) return;

        // Fetch Ken Raggio exegesis (shown above contributor notes)
        fetchKenExegesis({ book, chapter, verse }).then((r) => {
          if (r.ok) setKenRows(r.rows);
        });

        setNotesError(null);
        setNotesTriedUrl(null);

        const cachedApproved = await getCachedApprovedNotes(refId);
        if (cachedApproved) {
          setApprovedRows(cachedApproved);
          // Soft refresh in background so new approvals appear even if we have cached data
          fetchApprovedContributorNotes({ book, chapter, verse }).then(async (r) => {
            if (r.ok) {
              setApprovedRows(r.rows);
              await setCachedApprovedNotes(refId, r.rows);
            }
          });
        } else {
          const r = await fetchApprovedContributorNotes({ book, chapter, verse });
          setNotesTriedUrl(r.triedUrl);

          if (!r.ok) {
            setApprovedRows([]);
            setNotesError(r.error ?? "Unable to load notes");
          } else {
            setApprovedRows(r.rows);
            await setCachedApprovedNotes(refId, r.rows);
          }
        }

        const cachedAi = await getCachedAiExegesis(refId);
        if (cachedAi) setAi(cachedAi);
      } finally {
        setNotesLoading(false);
      }
    })();
  }, [visible, refId]);

  const generateAi = async () => {
    if (!verse || !book) return;

    setLoading(true);
    try {
      const result = await fetchAiExegesis({ version, book, chapter, verse, verseText });
      setAi(result);
      await setCachedAiExegesis(refId, result);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.exBackdrop} onPress={onClose} />

      <View style={styles.exModal}>
        <View style={styles.exHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exTitle}>Exegesis • {version}</Text>
            <Text style={styles.exRef}>
              {prettyBook(book)} {chapter}:{verse}
            </Text>
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.exClose, pressed && { opacity: 0.7 }]}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 14 }}>
          <Text style={styles.exVerseText}>{verseText || "—"}</Text>

          <View style={styles.exTabs}>
            <Pressable
              onPress={() => setTab("notes")}
              style={[styles.exTab, tab === "notes" && styles.exTabActive]}
            >
              <Text style={[styles.exTabText, tab === "notes" && styles.exTabTextActive]}>Notes</Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("ai")}
              style={[styles.exTab, tab === "ai" && styles.exTabActive]}
            >
              <Text style={[styles.exTabText, tab === "ai" && styles.exTabTextActive]}>AI</Text>
            </Pressable>
          </View>

          {tab === "notes" ? (
            notesLoading ? (
              <View style={styles.exCard}>
                <ActivityIndicator />
              </View>
            ) : (
              <>



                 {kenRows.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {kenRows.map((k) => (
                        
                        <View key={k.id} style={styles.kenCardFeatured}>
                          <View style={styles.kenTopRow}>
                            <View style={styles.kenAvatar}>
                              <Text style={styles.kenAvatarText}>KR</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.kenName} numberOfLines={1}>
                                Ken Raggio
                              </Text>
                              <Text style={styles.kenMeta} numberOfLines={1}>
                                AUTHOR
                                {k.updatedAt ? ` • ${formatShortDate(k.updatedAt)}` : ""}
                              </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={styles.authorChip}>
                                <Ionicons name="ribbon-outline" size={14} color="#fff" />
                                <Text style={styles.authorChipText}>Author</Text>
                              </View>

                              <View style={styles.verifiedChip}>
                                <Ionicons name="shield-checkmark-outline" size={14} color="#fff" />
                                <Text style={styles.verifiedChipText}>Verified</Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.contributorDivider} />

                          {k.heading ? <Text style={styles.kenHeading}>{k.heading}</Text> : null}
                          {k.anchorRaw ? <Text style={styles.kenAnchor}>{k.anchorRaw}</Text> : null}
                          <Text style={styles.kenBody}>{k.content}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                <ContributorNotes
                  rows={approvedRows}
                  error={notesError}
                  triedUrl={notesTriedUrl}
                />
              </>
            )
          ) : (
            <View>
              {ai ? (
                <ExegesisCard data={ai} />
              ) : (
                <View style={styles.exEmpty}>
                  <Text style={styles.exEmptyText}>No AI exegesis generated yet for this verse.</Text>

                  <Pressable
                    onPress={generateAi}
                    style={({ pressed }) => [styles.exGenBtn, pressed && { opacity: 0.8 }]}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <Ionicons name="sparkles-outline" size={18} color="#fff" />
                        <Text style={styles.exGenBtnText}>Generate</Text>
                      </>
                    )}
                  </Pressable>

                  <Text style={styles.exHint}>Generated results are cached on-device so you only pay once per verse.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
function ContributorNotes({
  rows,
  error,
  triedUrl,
}: {
  rows: ContributorRow[];
  error: string | null;
  triedUrl: string | null;
}) {
  if (error) {
    return (
      <View style={styles.exCard}>
        <Text style={styles.exSectionTitle}>Contributor Notes</Text>
        <Text style={styles.exBody}>Unable to load notes right now.</Text>
        <Text style={[styles.exBody, { marginTop: 8, opacity: 0.8 }]}>{error}</Text>
        {triedUrl ? (
          <Text style={[styles.exMetaText, { marginTop: 10 }]}>Tried: {triedUrl}</Text>
        ) : null}
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View style={styles.exCard}>
        <Text style={styles.exSectionTitle}>Contributor Notes</Text>
        <Text style={styles.exBody}>No approved contributor commentary found for this verse yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => {
        const name = displayName(row);
        const role = String(row.author?.role ?? "").toUpperCase();
        const date = formatShortDate(row.updatedAt);
        const initials = initialsFromName(row.author?.name ?? null, row.author?.email ?? null);

        return (
          <View key={row.id} style={styles.contributorCard}>
            <View style={styles.contributorTopRow}>
              <View style={styles.contributorAvatar}>
                <Text style={styles.contributorAvatarText}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.contributorName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.contributorMeta} numberOfLines={1}>
                  {role ? role : "CONTRIBUTOR"}
                  {date ? ` • ${date}` : ""}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {row.scope === "CHAPTER" ? (
                  <View style={styles.scopeChip}>
                    <Ionicons name="layers-outline" size={14} color="#fff" />
                    <Text style={styles.scopeChipText}>Chapter</Text>
                  </View>
                ) : (
                  <View style={styles.scopeChip}>
                    <Ionicons name="bookmark-outline" size={14} color="#fff" />
                    <Text style={styles.scopeChipText}>Verse</Text>
                  </View>
                )}

                <View style={styles.approvedChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <Text style={styles.approvedChipText}>Approved</Text>
                </View>
              </View>
            </View>

            <View style={styles.contributorDivider} />

            <Text style={styles.contributorBody}>{row.content}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ExegesisCard({
  data,
  emptyText,
}: {
  data: ExegesisResult | null;
  emptyText?: string;
}) {
  if (!data) {
    return (
      <View style={styles.exCard}>
        <Text style={styles.exBody}>{emptyText ?? "No data."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.exCard}>
      <Text style={styles.exSectionTitle}>Summary</Text>
      <Text style={styles.exBody}>{data.summary}</Text>

      {data.context ? (
        <>
          <Text style={styles.exSectionTitle}>Context</Text>
          <Text style={styles.exBody}>{data.context}</Text>
        </>
      ) : null}

      {data.keyTerms?.length ? (
        <>
          <Text style={styles.exSectionTitle}>Key Terms</Text>
          {data.keyTerms.map((k, idx) => (
            <Text key={idx} style={styles.exBullet}>
              • <Text style={{ fontWeight: "800" }}>{k.term}:</Text> {k.meaning}
            </Text>
          ))}
        </>
      ) : null}

      {data.crossRefs?.length ? (
        <>
          <Text style={styles.exSectionTitle}>Cross References</Text>
          <Text style={styles.exBody}>{data.crossRefs.join(", ")}</Text>
        </>
      ) : null}

      <View style={styles.exMeta}>
        <Text style={styles.exMetaText}>
          Source: {data.source.name}
          {data.source.license ? ` • ${data.source.license}` : ""}
        </Text>
      </View>
    </View>
  );
}

/* ================= POPUP COMPONENT ================= */

function VersePopup({
  visible,
  anchor,
  onClose,
  highlightLabel,
  onHighlight,
  saveLabel,
  saveIcon,
  saveActive,
  onSave,
  onCopy,
  onRead,
  onAsk,
  onNote,
  onExegesis,
}: {
  visible: boolean;
  anchor: Anchor;
  onClose: () => void;
  highlightLabel: string;
  onHighlight: () => void;
  saveLabel: string;
  saveIcon: keyof typeof Ionicons.glyphMap;
  saveActive: boolean;
  onSave: () => void;
  onCopy: () => void;
  onRead: () => void;
  onAsk: () => void;
  onNote: () => void;
  onExegesis: () => void;
}) {
  if (!visible || !anchor) return null;

  const { width: screenW, height: screenH } = Dimensions.get("window");

  const POPUP_W = Math.min(430, screenW - 24);
  const POPUP_H = 62;
  const GAP = 10;

  let left = anchor.x + anchor.w / 2 - POPUP_W / 2;
  left = Math.max(12, Math.min(left, screenW - POPUP_W - 12));

  let top = anchor.y - POPUP_H - GAP;
  const placeBelow = top < 60;
  if (placeBelow) top = Math.min(anchor.y + anchor.h + GAP, screenH - POPUP_H - 12);

  const showArrowDown = !placeBelow;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.popupBackdrop} onPress={onClose} />

      <View style={[styles.popup, { left, top, width: POPUP_W, height: POPUP_H }]}>
        <PopupAction icon="color-palette-outline" label={highlightLabel} onPress={onHighlight} />
        <PopupAction icon={saveIcon} label={saveLabel} onPress={onSave} active={saveActive} />
        <PopupAction icon="copy-outline" label="Copy" onPress={onCopy} />
        <PopupAction icon="volume-high-outline" label="Read" onPress={onRead} />
        <PopupAction icon="book-outline" label="Exegesis" onPress={onExegesis} />
        <PopupAction icon="create-outline" label="Note" onPress={onNote} />
      </View>

      <View
        style={[
          styles.popupArrow,
          {
            left: anchor.x + anchor.w / 2 - 7,
            top: showArrowDown ? top + POPUP_H - 7 : top - 7,
            transform: [{ rotate: showArrowDown ? "45deg" : "225deg" }],
          },
        ]}
      />
    </Modal>
  );
}

function PopupAction({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.popupBtn,
        active && styles.popupBtnActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? theme.colors.primary : "#EDEDED"} />
      <Text style={[styles.popupText, active && styles.popupTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safeLibrary: { flex: 1, backgroundColor: theme.colors.background },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 6,
    fontFamily: theme.fonts.ui,
  },

  versionTabs: { flexDirection: "row", gap: 10, marginTop: 14 },
  versionTab: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  versionTabActive: {
    backgroundColor: "rgba(192, 86, 33, 0.14)",
    borderColor: "rgba(192, 86, 33, 0.18)",
  },
  versionTabText: {
    color: theme.colors.textSecondary,
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },
  versionTabTextActive: { color: theme.colors.primary },

  testamentTabs: { flexDirection: "row", gap: 10, marginTop: 12 },
  testamentTab: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testamentTabActive: {
    backgroundColor: "rgba(192, 86, 33, 0.14)",
    borderColor: "rgba(192, 86, 33, 0.18)",
  },
  testamentTabText: {
    color: theme.colors.textSecondary,
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },
  testamentTabTextActive: { color: theme.colors.primary },

  bookCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bookHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookName: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 16,
    fontFamily: theme.fonts.ui,
  },

  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chapterChip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chapterText: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },

  safeReader: { flex: 1 },

  readerHeaderOverlay: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 50,
  },

  readerTop: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(244, 241, 234, 0.92)",
  },
  backIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  readerHeaderCenter: { flex: 1, alignItems: "center" },
  readerRef: {
    fontSize: 14,
    marginBottom: 6,
    fontFamily: theme.fonts.ui,
  },
  readerHeading: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: theme.fonts.heading,
    textAlign: "center",
  },

  audioBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  readerParagraphWrap: {
    paddingHorizontal: 18,
    paddingBottom: 140,
  },

  readerParagraph: {
    fontSize: 18,
    lineHeight: 32,
    fontFamily: theme.fonts.body,
    marginBottom: 18,
  },

  inlineVerseNumber: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.heading,
  },
  inlineVerseText: {
    fontFamily: theme.fonts.body,
  },

  inlineSelectedUnderline: {
    textDecorationLine: "underline",
    textDecorationColor: theme.colors.primary,
  },

  inlineHighlighted: {
    backgroundColor: theme.reader?.highlight ?? "rgba(255, 200, 120, 0.45)",
  },

  popupBackdrop: { flex: 1, backgroundColor: "transparent" },
  popup: {
    position: "absolute",
    backgroundColor: "#2A2A2A",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  popupBtn: {
    width: 62,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  popupBtnActive: {
    backgroundColor: "rgba(192, 86, 33, 0.18)",
    borderRadius: 10,
  },
  popupText: {
    color: "#EDEDED",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.ui,
    textAlign: "center",
  },
  popupTextActive: { color: theme.colors.primary },
  popupArrow: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: "#2A2A2A",
    transform: [{ rotate: "45deg" }],
  },

  copyToast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyToastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.ui,
  },

  /* ===== Exegesis ===== */
  exBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  exModal: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 90,
    backgroundColor: "#1F1F1F",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  exHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  exTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    fontFamily: theme.fonts.ui,
  },
  exRef: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    fontFamily: theme.fonts.ui,
  },
  exClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exVerseText: {
    color: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  exTabs: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  exTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  exTabActive: {
    backgroundColor: "rgba(192, 86, 33, 0.25)",
    borderColor: "rgba(192, 86, 33, 0.22)",
  },
  exTabText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },
  exTabTextActive: { color: "#fff" },

  exCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  exSectionTitle: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
    marginBottom: 8,
    marginTop: 10,
  },
  exBody: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  exBullet: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  exMeta: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  exMetaText: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: theme.fonts.ui,
    fontSize: 12,
  },
  exEmpty: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  exEmptyText: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  exGenBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(192, 86, 33, 0.85)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  exGenBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
  },
  exHint: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: theme.fonts.ui,
    fontSize: 12,
    lineHeight: 18,
  },


  /* ===== Ken (Premium Author) ===== */
kenCard: {
  marginHorizontal: 14,
  padding: 14,
  borderRadius: 16,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",

},
kenTopRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},
kenAvatar: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: "rgba(245, 158, 11, 0.28)",
  borderWidth: 1,
  borderColor: "rgba(245, 158, 11, 0.40)",
  alignItems: "center",
  justifyContent: "center",
},
kenAvatarText: {
  color: "#fff",
  fontWeight: "900",
  fontFamily: theme.fonts.ui,
  letterSpacing: 0.8,
},
kenName: {
  color: "#fff",
  fontWeight: "900",
  fontFamily: theme.fonts.ui,
  fontSize: 14,
},
kenMeta: {
  color: "rgba(255,255,255,0.7)",
  marginTop: 2,
  fontFamily: theme.fonts.ui,
  fontSize: 12,
},
kenHeading: {
  color: "#fff",
  fontWeight: "900",
  fontFamily: theme.fonts.ui,
  fontSize: 15,
  marginBottom: 6,
},
kenAnchor: {
  color: "rgba(255,255,255,0.70)",
  fontFamily: theme.fonts.ui,
  fontSize: 12,
  marginBottom: 10,
},
kenBody: {
  color: "rgba(255,255,255,0.92)",
  fontFamily: theme.fonts.body,
  fontSize: 15,
  lineHeight: 23,
},
authorChip: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "rgba(245, 158, 11, 0.30)",
  borderWidth: 1,
  borderColor: "rgba(245, 158, 11, 0.45)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},
authorChipText: {
  color: "#fff",
  fontWeight: "900",
  fontFamily: theme.fonts.ui,
  fontSize: 11,
},

kenCardFeatured: {
  marginHorizontal: 14,
  padding: 14,
  borderRadius: 16,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(245, 158, 11, 0.40)",

  // subtle "featured" glow (works best on iOS)
  shadowColor: "rgba(245, 158, 11, 0.55)",
  shadowOpacity: 0.35,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },

  // Android glow
  elevation: 6,
},

verifiedChip: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "rgba(59, 130, 246, 0.28)", // blue
  borderWidth: 1,
  borderColor: "rgba(59, 130, 246, 0.45)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},
verifiedChipText: {
  color: "#fff",
  fontWeight: "900",
  fontFamily: theme.fonts.ui,
  fontSize: 11,
},


  /* ===== Premium contributor notes ===== */

  contributorCard: {
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginTop: 12,
  },
  contributorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contributorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(192, 86, 33, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(192, 86, 33, 0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  contributorAvatarText: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
    letterSpacing: 0.8,
  },
  contributorName: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
    fontSize: 14,
  },
  contributorMeta: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontFamily: theme.fonts.ui,
    fontSize: 12,
  },
  approvedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46, 160, 67, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(46, 160, 67, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  approvedChipText: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
    fontSize: 11,
  },
  scopeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99, 102, 241, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.38)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scopeChipText: {
    color: "#fff",
    fontWeight: "900",
    fontFamily: theme.fonts.ui,
    fontSize: 11,
  },
  contributorDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 12,
    marginBottom: 12,
  },
  contributorBody: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },});