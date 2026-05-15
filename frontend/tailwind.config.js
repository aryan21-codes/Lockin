/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#050505',
        surfaceHover: '#0a0a0a',
        surfaceElevated: '#111111',
        primary: '#6366f1',
        accent: '#8b5cf6',
        neonBlue: '#3b82f6',
        neonPurple: '#a855f7',
        emerald: '#10b981',
        amber: '#f59e0b',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
