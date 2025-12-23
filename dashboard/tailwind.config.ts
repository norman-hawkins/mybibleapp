import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f7f7f5",
        card: "#ffffff",
        border: "#e6e6e3",
        ink: "#1c1c1c",
        muted: "#6b6b6b",
      },
    },
  },
  plugins: [],
};

export default config;
