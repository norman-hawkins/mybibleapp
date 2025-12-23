import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#E6E2DB",
    surface: "#F2EFE9",
    surfaceAlt: "#E0DBD2",

    textPrimary: "#2B2A28",
    textSecondary: "#6B6862",

    primary: "#C05621",
    accent: "#C05621",

    border: "rgba(0,0,0,0.08)",
  },

  fonts: {
    // Body text (Bible verses, paragraphs)
    body: Platform.select({
      ios: "Iowan Old Style",          // system font on iOS
      android: "serif",                // fallback unless bundled
      default: "serif",
    }),

    // Bold / headings
    heading: Platform.select({
      ios: "Iowan Old Style",
      android: "serif",
      default: "serif",
    }),

    // UI labels (buttons, tabs)
    ui: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "System",
    }),
  },

  reader: {
    background: "#F4F1EA",
    text: "#1F1F1F",
    verseNumber: "#C05621",
    heading: "#2D2A26",
    subheading: "#6B6862",
    highlight: "rgba(255, 200, 120, 0.45)",
  },

  radius: {
    sm: 8,
    md: 14,
    lg: 20,
  },
} as const;
