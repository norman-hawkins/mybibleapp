import { prettyBook } from "@/lib/bibleBooks";
import { Bookmark, listBookmarks, removeBookmark } from "@/lib/bookmarks";
import { theme } from "@/lib/theme";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function BookmarksScreen() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const all = await listBookmarks();
      setItems(all);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const openBookmark = (b: Bookmark) => {
    router.push({
      pathname: "/(tabs)/bible",
      params: {
        book: b.book,
        chapter: String(b.chapter),
        verse: String(b.verse),
      },
    });
  };

  const onDelete = async (id: string) => {
    await removeBookmark(id);
    await refresh();
  };

  const subtitleText = useMemo(() => {
    if (loading) return "Loading...";
    return `${items.length} saved`;
  }, [loading, items.length]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookmarks</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptyText}>
                Tap a verse → open the popup → “Save Bookmark”
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openBookmark(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ref}>
                {prettyBook(item.book)} {item.chapter}:{item.verse}
              </Text>

              <Text style={styles.text} numberOfLines={3}>
                {item.text}
              </Text>
            </View>

            <Pressable
              onPress={() => onDelete(item.id)}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
              hitSlop={10}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background, // ✅ #E6E2DB
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: theme.colors.surface, // ✅ card surface
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  pressed: {
    opacity: 0.75,
  },

  ref: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginBottom: 6,
  },

  text: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  deleteBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // warm “danger” look without harsh red on parchment theme
  deleteText: {
    color: theme.colors.accent, // ✅ uses theme accent (warm)
    fontWeight: "800",
  },

  empty: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
