import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          bg: "#000000",
          900: "#111111",
          800: "#151414",
          700: "#161616",
        },
        paper: {
          50: "#FAF9F7",
          100: "#F5F5F0",
          300: "#AAAAAA",
          400: "#888888",
        },
        accent: {
          DEFAULT: "#FCF30B",
          foreground: "#000000",
        },
        border: "rgba(255,255,255,0.08)",
        ring: "#FCF30B",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        sans: ["var(--font-open-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
        "display-lg": ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        250: "250ms",
      },
      borderRadius: {
        card: "4px",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};

export default config;
