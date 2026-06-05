/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#07091a',
        surface: '#0e1424',
        elevated: '#131c2e',
        border: 'rgba(99,102,241,0.14)',
        accent: '#818cf8',
        'accent-dim': 'rgba(129,140,248,0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
