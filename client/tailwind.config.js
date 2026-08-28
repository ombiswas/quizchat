/** @type {import('tailwindcss').Config} */
export default {
  // Scan all TSX/TS files in src/ so Tailwind only ships classes actually used.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  // Dark mode driven by class on <html>
  darkMode: 'class',

  theme: {
    extend: {
      // ── Custom color palette ───────────────────────────────────────────────
      // Deep ink canvas with high-contrast surfaces and deliberate accent hue.
      colors: {
        ink: {
          950: '#08090c',   // Deepest canvas / background
          900: '#111318',   // Container surface / chat thread backing
          850: '#171a22',   // Incoming message bubble surface
          800: '#1e222d',   // Elevated surfaces / option buttons
          750: '#252936',   // Hovered option surface
          700: '#2d3243',   // Subtle borders and dividers
          600: '#454b63',   // Muted elements / timestamps
          400: '#8f96b0',   // Secondary labels
          200: '#d0d5e5',   // Subtitle text
          100: '#f1f3f9',   // High-contrast primary text
        },
        // Option 1 Default: Solar Amber (Rich, warm, scholarly)
        accent: {
          DEFAULT: '#f59e0b',
          light:   '#fbbf24',
          dark:    '#b45309',
          glow:    'rgba(245, 158, 11, 0.25)',
          subtle:  'rgba(245, 158, 11, 0.12)',
        },
        // Electric Indigo Option
        indigoAccent: {
          DEFAULT: '#6366f1',
          light:   '#818cf8',
          dark:    '#4338ca',
          glow:    'rgba(99, 102, 241, 0.25)',
          subtle:  'rgba(99, 102, 241, 0.12)',
        },
        // Oceanic Cyan Option
        cyanAccent: {
          DEFAULT: '#06b6d4',
          light:   '#22d3ee',
          dark:    '#0e7490',
          glow:    'rgba(6, 182, 212, 0.25)',
          subtle:  'rgba(6, 182, 212, 0.12)',
        },
        success: {
          DEFAULT: '#10b981',
          light:   '#34d399',
          dark:    '#059669',
          subtle:  'rgba(16, 185, 129, 0.14)',
        },
        danger: {
          DEFAULT: '#f43f5e',
          light:   '#fb7185',
          dark:    '#e11d48',
          subtle:  'rgba(244, 63, 94, 0.14)',
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        // Manrope for body text and interactive elements
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        // Distinctive display face for headings, logo, and score reveals
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Monospace for stats, timings, and code
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // ── Spacing & Radius Tokens ───────────────────────────────────────────
      borderRadius: {
        bubble: '1.25rem',     // 20px - Chat bubble radius
        'bubble-lg': '1.5rem', // 24px - Large chat bubble radius
        panel: '1rem',         // 16px - Card / panel radius
        pill: '9999px',
      },

      // ── Elevation & Glow Shadows ──────────────────────────────────────────
      boxShadow: {
        bubble: '0 2px 8px -2px rgba(0, 0, 0, 0.4), 0 1px 3px -1px rgba(0, 0, 0, 0.2)',
        glow: '0 0 24px -4px rgba(245, 158, 11, 0.3)',
        'glow-cyan': '0 0 24px -4px rgba(6, 182, 212, 0.3)',
        'glow-indigo': '0 0 24px -4px rgba(99, 102, 241, 0.3)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },

  plugins: [],
}
