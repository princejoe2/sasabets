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
        "mk-bg":          "rgb(var(--mk-bg-rgb) / <alpha-value>)",
        "mk-surface":     "rgb(var(--mk-surface-rgb) / <alpha-value>)",
        "mk-card":        "rgb(var(--mk-card-rgb) / <alpha-value>)",
        "mk-raised":      "rgb(var(--mk-raised-rgb) / <alpha-value>)",
        // Borders
        "mk-border":      "rgb(var(--mk-border-rgb) / <alpha-value>)",
        "mk-card-border": "var(--mk-card-border)",
        "mk-divider":     "rgb(var(--mk-divider-rgb) / <alpha-value>)",
        // Text
        "mk-text":        "rgb(var(--mk-text-rgb) / <alpha-value>)",
        "mk-secondary":   "rgb(var(--mk-secondary-rgb) / <alpha-value>)",
        "mk-muted":       "rgb(var(--mk-muted-rgb) / <alpha-value>)",
        // YES
        "mk-yes":         "rgb(var(--mk-yes-rgb) / <alpha-value>)",
        "mk-yes-bg":      "var(--mk-yes-bg)",
        "mk-yes-text":    "rgb(var(--mk-yes-text-rgb) / <alpha-value>)",
        // NO
        "mk-no":          "rgb(var(--mk-no-rgb) / <alpha-value>)",
        "mk-no-bg":       "var(--mk-no-bg)",
        "mk-no-text":     "rgb(var(--mk-no-text-rgb) / <alpha-value>)",
        // Accent (brand orange)
        "mk-accent":      "rgb(var(--mk-accent-rgb) / <alpha-value>)",
        "mk-accent-bg":   "var(--mk-accent-bg)",
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
