import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: { base: '#0a0e1a', panel: '#111827', raised: '#151f30', line: '#243146' },
        disclosed: '#22d3ee',
        private: '#fbbf24',
        success: '#22c55e',
        danger: '#ef4444',
        accent: '#6366f1',
      },
      fontFamily: { sans: ['Manrope', 'sans-serif'], mono: ['DM Mono', 'monospace'] },
    },
  },
  plugins: [],
} satisfies Config;
