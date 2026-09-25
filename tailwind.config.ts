import type { Config } from "tailwindcss";

/**
 * Wink design system — Crimson / Black Neon
 * bg #050505, neon #ff1f3d, Bricolage + Geist
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        surface: {
          DEFAULT: "#0b0b0c",
          2: "#111113",
          3: "#16161a",
        },
        line: {
          DEFAULT: "#1f1f25",
          2: "#2a2a33",
        },
        neon: {
          DEFAULT: "#ff1f3d",
          bright: "#ff3355",
          deep: "#c80d28",
          soft: "rgba(255, 31, 61, 0.12)",
          glow: "rgba(255, 31, 61, 0.55)",
        },
        ink: {
          DEFAULT: "#f5f5f7",
          2: "#a8a8b3",
          3: "#6a6a76",
          4: "#3d3d46",
        },
        // legacy aliases for existing components
        paper: {
          DEFAULT: "#050505",
          raised: "#0b0b0c",
          dim: "#111113",
        },
        wink: {
          DEFAULT: "#ff1f3d",
          soft: "rgba(255, 31, 61, 0.12)",
          deep: "#c80d28",
          ink: "#ff1f3d",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -12px rgba(0,0,0,0.4)",
        lift: "0 2px 4px rgba(0,0,0,0.2), 0 16px 40px -16px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
