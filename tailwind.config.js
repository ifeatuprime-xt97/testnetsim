/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        theme: {
          base:     'var(--bg-base)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          glow:    'var(--accent-glow)',
          dim:     'var(--accent-dim)',
        },
        dark: {
          950: '#05080f',
          900: '#080d18',
          800: '#0d1425',
          700: '#131c33',
          600: '#1a2540',
          500: '#223052',
        },
        neon: {
          indigo: '#818cf8',
          violet: '#a78bfa',
          cyan:   '#22d3ee',
          green:  '#34d399',
          amber:  '#fbbf24',
          red:    '#f87171',
        },
        slate: {
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
        },
      },
      keyframes: {
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 0px var(--accent-glow)' },
          '50%':      { boxShadow: '0 0 20px 4px var(--accent-glow)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'gradient-rotate': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(99, 102, 241, 0.3)' },
          '50%':      { borderColor: 'rgba(99, 102, 241, 0.8)' },
        },
        'spin-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':       'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse':     'glow-pulse 2s ease-in-out infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'float':          'float 3s ease-in-out infinite',
        'gradient-rotate':'gradient-rotate 4s ease infinite',
        'border-glow':    'border-glow 2s ease-in-out infinite',
        'spin-slow':      'spin-slow 8s linear infinite',
        'fade-in':        'fade-in 0.2s ease-out',
        'scale-in':       'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundSize: {
        '200%': '200%',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm':  '0 0 10px 0 var(--accent-glow)',
        'glow':     '0 0 20px 0 var(--accent-glow)',
        'glow-lg':  '0 0 40px 0 var(--accent-glow)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
        'panel': '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 inset rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
