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
        // Aligned to the rest of the suite: the command-center pages use Inter, not a
        // separate display face. font-display now renders Inter so FraudSense matches.
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        borderDraw: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        resultsScan: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        iconScan: {
          '0%': { transform: 'translateY(-2px)', opacity: '0' },
          '15%': { opacity: '0.9' },
          '50%': { transform: 'translateY(18px)', opacity: '0.9' },
          '65%': { opacity: '0' },
          '100%': { transform: 'translateY(18px)', opacity: '0' },
        },
        eq: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        borderPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        actionFlash: {
          '0%': { filter: 'brightness(2.4)', textShadow: '0 0 24px rgba(255,255,255,0.85)' },
          '100%': { filter: 'brightness(1)', textShadow: '0 0 0 rgba(255,255,255,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        // FraudSense panel entrances
        'panel-1': 'fadeUp 0.35s 400ms ease-out both',
        'panel-2': 'fadeUp 0.35s 550ms ease-out both',
        'panel-3': 'fadeUp 0.35s 700ms ease-out both',
        'panel-4': 'fadeUp 0.35s 850ms ease-out both',
        'panel-5': 'fadeUp 0.35s 1000ms ease-out both',
        'panel-6': 'fadeUp 0.35s 1150ms ease-out both',
        'panel-7': 'fadeUp 0.35s 1300ms ease-out both',
        'border-1': 'borderDraw 0.4s 600ms ease-out both',
        'border-2': 'borderDraw 0.4s 750ms ease-out both',
        'border-3': 'borderDraw 0.4s 900ms ease-out both',
        'border-4': 'borderDraw 0.4s 1050ms ease-out both',
        'border-5': 'borderDraw 0.4s 1200ms ease-out both',
        'border-6': 'borderDraw 0.4s 1350ms ease-out both',
        'border-7': 'borderDraw 0.4s 1500ms ease-out both',
        'results-scan': 'resultsScan 0.6s ease-out forwards',
        'icon-scan': 'iconScan 3s ease-in-out infinite',
        'border-pulse': 'borderPulse 1.2s ease-in-out infinite',
        'action-flash': 'actionFlash 0.4s ease-out both',
        shimmer: 'shimmer 1.5s infinite linear',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
        spin: 'spin 0.8s linear infinite',
        // RuleBreaker animations
        'fade-in-up': 'fadeInUp 0.45s ease-out both',
        'fade-in-up-1': 'fadeInUp 0.45s 120ms ease-out both',
        'fade-in-up-2': 'fadeInUp 0.45s 240ms ease-out both',
      },
    },
  },
  plugins: [],
};
