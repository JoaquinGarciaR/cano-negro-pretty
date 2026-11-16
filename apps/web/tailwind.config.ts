import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pretty: {
          pink: {
            50: '#FDF2F4',
            100: '#FCE7F0',
            200: '#FBCFE8',
            300: '#F9A8D4',
            400: '#F472B6',
            500: '#EC4899',
            600: '#DB2777',
            700: '#BE185D',
          },
          wine: {
            600: '#9D174D',
            700: '#831843',
            800: '#581C2E',
            900: '#4A0E17',
            950: '#2D080D',
          },
          cream: {
            50: '#FFFDF9',
            100: '#FAF6F0',
            200: '#F5EBE1',
            300: '#EADECE',
          },
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(244, 114, 182, 0.08)',
        'glass-hover': '0 12px 40px 0 rgba(244, 114, 182, 0.16)',
        'glass-wine': '0 8px 30px 0 rgba(74, 14, 23, 0.25)',
      },
      backgroundImage: {
        'girly-gradient': 'linear-gradient(135deg, #FFFDF9 0%, #FCE7F0 50%, #FDF2F4 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.45) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
