import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          50:  '#F0FDF9',
          100: '#CCFBEF',
          500: '#0F766E',
          600: '#0D6660',
          700: '#0A524D',
        },
        navy: {
          DEFAULT: '#142B4A',
          700: '#142B4A',
          900: '#0B1A2E',
        },
        surface: '#FFFFFF',
        'border-color': '#E2E8F0',
        muted: '#475569',
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '8px',
      },
    },
  },
  plugins: [],
}

export default config