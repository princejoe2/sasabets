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
      },
      fontFamily: {
        supreme: ['var(--font-supreme)', 'system-ui', 'sans-serif'],
        chubbo:  ['var(--font-chubbo)',  'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
