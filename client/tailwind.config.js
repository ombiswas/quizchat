/** @type {import('tailwindcss').Config} */
export default {
  // Scan all TSX/TS files in src/ so Tailwind only ships classes actually used.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  // Dark mode driven by a class on <html> so we can toggle it programmatically.
  darkMode: 'class',

  theme: {
    extend: {
      // ── Custom colour palette ─────────────────────────────────────────────
      // "Deep ink" dark background with a warm amber accent.
      // Not WhatsApp green — the accent is deliberate and distinct.
      colors: {
        ink: {
          950: '#0b0c10',   // deepest background
          900: '#12141a',   // card / surface
          800: '#1c1f28',   // elevated surface
          700: '#272b38',   // border / divider
          600: '#3a3f52',   // muted element
        },
        accent: {
          DEFAULT: '#f59e0b', // warm amber — primary CTA, highlights
          light:   '#fcd34d',
          dark:    '#b45309',
        },
        success: '#22c55e',
        danger:  '#ef4444',
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        // Body / UI text
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Display / scores / headings — a distinctive face
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },

      // ── Border radius tokens ──────────────────────────────────────────────
      borderRadius: {
        bubble: '1.25rem', // chat bubble corners
      },
    },
  },

  plugins: [],
}
