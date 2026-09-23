import type { Config } from "tailwindcss";

/**
 * Wink design system — "Paper & Gold"
 * Warm cream paper, deep espresso ink, refined gold.
 * A private bank crossed with a Lagos creative studio.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces — warm cream family
        paper: {
          DEFAULT: "#F7F2E7", // page
          raised: "#FDFBF4", // cards, inputs
          dim: "#EFE7D3", // hovers, insets
          deep: "#E5D9BE", // stronger insets
        },
        // espresso scale — text & intentional dark blocks
        ink: {
          950: "#1C1610",
          900: "#2B2318",
          800: "#443826",
          700: "#61513A",
          500: "#94856B",
          400: "#7A6B52",
          300: "#5C4E39",
          200: "#443826",
          100: "#2B2318",
        },
        // borders
        line: {
          DEFAULT: "#E2D7BE",
          strong: "#D2C3A0",
        },
        // the wink gold
        wink: {
          DEFAULT: "#C9972B",
          soft: "#E9CF8F",
          deep: "#9A7218",
          ink: "#6E5112",
        },
        // money green — deep, premium
        mint: {
          DEFAULT: "#3E7C4F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,22,16,0.04), 0 8px 24px -12px rgba(28,22,16,0.12)",
        lift: "0 2px 4px rgba(28,22,16,0.06), 0 16px 40px -16px rgba(28,22,16,0.2)",
      },
      animation: {
        "wink-in": "winkIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        winkIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
