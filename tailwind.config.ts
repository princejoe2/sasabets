import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Market page design tokens
        "mk-bg":       "#000000",
        "mk-surface":  "#0A0A0A",
        "mk-card":     "#111111",
        "mk-raised":   "#1A1A1A",
        "mk-border":   "#222222",
        "mk-divider":  "#1A1A1A",
        "mk-text":     "#F5F5F5",
        "mk-secondary":"#A1A1A1",
        "mk-muted":    "#6B6B6B",
        "mk-yes":      "#22C55E",
        "mk-yes-bg":   "rgba(34,197,94,0.12)",
        "mk-no":       "#EF4444",
        "mk-no-bg":    "rgba(239,68,68,0.12)",
        "mk-accent":   "#22C55E",
      },
      borderRadius: {
        "r-card":  "12px",
        "r-btn":   "10px",
        "r-input": "8px",
      },
      fontFamily: {
        supreme: ['var(--font-supreme)', 'system-ui', 'sans-serif'],
        chubbo:  ['var(--font-chubbo)',  'system-ui', 'sans-serif'],
        inter:   ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
