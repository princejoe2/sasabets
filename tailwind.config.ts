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
        background: "var(--mk-bg)",
        foreground: "var(--mk-text)",
        // Core surfaces
        "mk-bg":          "#000000",
        "mk-surface":     "#0A0A0A",
        "mk-card":        "#111111",
        "mk-raised":      "#1A1A1A",
        // Borders
        "mk-border":      "#222222",
        "mk-card-border": "rgba(255,255,255,0.08)",
        "mk-divider":     "#1A1A1A",
        // Text
        "mk-text":        "#F5F5F5",
        "mk-secondary":   "#A1A1A1",
        "mk-muted":       "#6B6B6B",
        // YES
        "mk-yes":         "#22C55E",
        "mk-yes-bg":      "rgba(34,197,94,0.12)",
        "mk-yes-text":    "#4ADE80",
        // NO
        "mk-no":          "#EF4444",
        "mk-no-bg":       "rgba(239,68,68,0.12)",
        "mk-no-text":     "#F87171",
        // Accent (brand orange)
        "mk-accent":      "#FF9F43",
        "mk-accent-bg":   "rgba(255,159,67,0.12)",
        // Candidate palette (color_index 0–7)
        "mk-c0":          "#F5B83D",
        "mk-c1":          "#EC4899",
        "mk-c2":          "#3B82F6",
        "mk-c3":          "#22C55E",
        "mk-c4":          "#A855F7",
        "mk-c5":          "#F97316",
        "mk-c6":          "#14B8A6",
        "mk-c7":          "#EAB308",
      },
      borderRadius: {
        "r-card":  "16px",
        "r-btn":   "12px",
        "r-pill":  "999px",
        "r-input": "8px",
      },
      fontFamily: {
        inter:   ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        supreme: ['var(--font-supreme)', 'system-ui', 'sans-serif'],
        chubbo:  ['var(--font-chubbo)',  'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '400': '400ms',
        '800': '800ms',
      },
      zIndex: {
        'content':        '1',
        'sticky-header':  '10',
        'buy-bar':        '20',
        'bottom-nav':     '30',
        'sheet-backdrop': '40',
        'sheet':          '50',
        'modal':          '60',
        'toast':          '70',
        'progress-bar':   '80',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring':        'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
