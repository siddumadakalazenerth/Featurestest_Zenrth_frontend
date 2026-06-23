import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F1', // page background — warm, not stark white
        ink: '#1B1F27', // primary text
        panel: '#12161D', // deep ink-navy — used for the pipeline strip signature
        'panel-line': '#262B35',
        hairline: '#E6E0D2',
        surface: '#FFFFFF',
        analysis: {
          DEFAULT: '#0E7C7B', // teal — the Gemini analysis layer
          soft: '#E3F1EF',
        },
        approved: {
          DEFAULT: '#3F8F5F',
          soft: '#E7F3EA',
        },
        gate: {
          DEFAULT: '#C97A1F', // amber — attention / gated state
          soft: '#FBF0E0',
        },
        skip: {
          DEFAULT: '#B5503A', // muted terracotta — skipped / failed
          soft: '#F8EAE5',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
