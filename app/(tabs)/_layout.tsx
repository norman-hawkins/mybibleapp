import { theme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,

          // ✅ ensures the “scene” area behind tab screens is dark
          sceneContainerStyle: { backgroundColor: theme.colors.background },

          tabBarStyle: {
            position: "absolute",
            bottom: -35,
            left: 0,
            right: 0,
            height: 80,
            paddingTop: 6,
            paddingBottom: 0,
            backgroundColor: theme.colors.surface,

          },

          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,

          tabBarIcon: ({ color, focused }) => {
            let icon: keyof typeof Ionicons.glyphMap = "home-outline";

            switch (route.name) {
              case "index":
                icon = focused ? "home" : "home-outline";
                break;
              case "bible":
                icon = focused ? "book" : "book-outline";
                break;
              case "prayer":
                icon = focused ? "heart" : "heart-outline";
                break;
              case "bookmarks":
                icon = focused ? "bookmark" : "bookmark-outline";
                break;
            }

            return <Ionicons name={icon} size={22} color={color} />;
          },
        })}
      >
        {/* VISIBLE TABS */}
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="bible" options={{ title: "Bible" }} />
        <Tabs.Screen name="prayer" options={{ title: "Prayer" }} />
        <Tabs.Screen name="bookmarks" options={{ title: "Saved" }} />

        {/* HIDDEN ROUTES */}
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="devotional" options={{ href: null }} />
      </Tabs>

      {/* Floating Chat Button */}
      <Pressable
        onPress={() => router.push("/chat")}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <Ionicons name="sparkles" size={26} color={theme.colors.surface} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
});
