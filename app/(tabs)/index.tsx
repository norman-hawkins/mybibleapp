import { theme } from "@/lib/theme";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Evening</Text>
          <Text style={styles.subGreeting}>Take a moment with God today.</Text>
        </View>

        {/* Verse of the Day */}
        <View style={styles.verseCard}>
          <View style={styles.verseAccent} />
          <Text style={styles.verseRef}>John 14:27</Text>
          <Text style={styles.verseText}>
            “Peace I leave with you; my peace I give to you. I do not give to
            you as the world gives.”
          </Text>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/bible",
                params: { book: "john", chapter: "14" },
              })
            }
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.linkBtnText}>Read in Context →</Text>
          </Pressable>
        </View>

        {/* Main Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>

          <View style={styles.grid}>
            <ActionCard
              title="Read Bible"
              subtitle="Continue reading"
              onPress={() => router.push("/bible")}
            />
            <ActionCard
              title="Devotional"
              subtitle="Daily reflection"
              onPress={() => router.push("/devotional")}
            />
            <ActionCard
              title="Prayer"
              subtitle="Speak with God"
              onPress={() => router.push("/prayer")}
            />
            <ActionCard
              title="Saved"
              subtitle="Bookmarks"
              onPress={() => router.push("/bookmarks")}
            />
          </View>
        </View>

        {/* Continue Reading */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Reading</Text>

          <Pressable
            style={({ pressed }) => [styles.continueCard, pressed && { opacity: 0.7 }]}
            onPress={() =>
              router.push({
                pathname: "/bible",
                params: { book: "john", chapter: "3" },
              })
            }
          >
            <Text style={styles.continueRef}>John 3</Text>
            <Text style={styles.continueText}>For God so loved the world…</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  header: { marginBottom: 24 },
  greeting: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  subGreeting: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },

  verseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 18,
    marginBottom: 28,
    position: "relative",
    overflow: "hidden",
  },
  verseAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 3,
    backgroundColor: theme.colors.accent, // 👈 amber accent
  },
  verseRef: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    marginBottom: 8,
    paddingLeft: 6,
  },
  verseText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    paddingLeft: 6,
  },

  linkBtn: { marginTop: 14, paddingLeft: 6 },
  linkBtnText: { color: theme.colors.primary, fontWeight: "800" },

  section: { marginBottom: 28 },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  card: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },

  continueCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.card,
    padding: 16,
  },
  continueRef: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    marginBottom: 6,
  },
  continueText: { color: theme.colors.textSecondary },
});
