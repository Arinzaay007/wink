import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0f",
          900: "#101018",
          800: "#181824",
          700: "#232334",
          500: "#4a4a66",
          300: "#9d9db5",
          100: "#e8e8f2",
        },
        wink: {
          DEFAULT: "#ffd166",
          soft: "#ffe3a3",
          deep: "#f4a261",
        },
        mint: {
          DEFAULT: "#4ade80",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
