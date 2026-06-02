/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgba(var(--border), <alpha-value>)",
        input: "rgba(var(--input), <alpha-value>)",
        ring: "rgba(var(--ring), <alpha-value>)",
        background: "rgba(var(--background), <alpha-value>)",
        foreground: "rgba(var(--foreground), <alpha-value>)",
        primary: {
          DEFAULT: "rgba(var(--primary), <alpha-value>)",
          foreground: "rgba(var(--primary-foreground), <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgba(var(--secondary), <alpha-value>)",
          foreground: "rgba(var(--secondary-foreground), <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgba(var(--destructive), <alpha-value>)",
          foreground: "rgba(var(--destructive-foreground), <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgba(var(--muted), <alpha-value>)",
          foreground: "rgba(var(--muted-foreground), <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgba(var(--accent), <alpha-value>)",
          foreground: "rgba(var(--accent-foreground), <alpha-value>)",
        },
        card: {
          DEFAULT: "rgba(var(--card), <alpha-value>)",
          foreground: "rgba(var(--card-foreground), <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
}
