import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/**/*.tsx",
    "../../packages/**/*.ts"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        border: "hsl(216 34% 17%)",
        input: "hsl(216 34% 17%)",
        ring: "hsl(24 95% 53%)",
        background: "hsl(210 20% 98%)",
        foreground: "hsl(222 47% 11%)",
        primary: {
          DEFAULT: "hsl(24 95% 53%)",
          foreground: "hsl(48 100% 99%)"
        },
        secondary: {
          DEFAULT: "hsl(216 34% 17%)",
          foreground: "hsl(48 100% 99%)"
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(48 100% 99%)"
        },
        muted: {
          DEFAULT: "hsl(216 34% 92%)",
          foreground: "hsl(216 34% 30%)"
        },
        accent: {
          DEFAULT: "hsl(48 100% 96%)",
          foreground: "hsl(24 95% 22%)"
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "hsl(222 47% 11%)"
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "hsl(222 47% 11%)"
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [animatePlugin]
};

export default config;
