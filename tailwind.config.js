/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx,js,jsx}',
    './store/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}',
    './utils/**/*.{ts,tsx,js,jsx}',
    './core/**/*.{ts,tsx,js,jsx}',
    './infrastructure/**/*.{ts,tsx,js,jsx}',
    './constants/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      borderWidth: {
        '3': '3px',
        '6': '6px',
      },
      boxShadow: {
        'comic': '6px 6px 0px #000',
        'comic-sm': '3px 3px 0px #000',
        'comic-lg': '10px 10px 0px #000',
      },
      fontFamily: {
        display: ['"Fredoka One"', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bangers: ['Bangers', 'cursive'], // 🔥 PERFECT POLISH: Comic font
        comic: ['Bangers', 'cursive'], // Alias for consistency
      },
      colors: {
        'brand-bg': '#0a0a0a',
        'comic-pink': '#FF69B4',
        'comic-yellow': '#FFD700',
        'comic-blue': '#00BFFF',
        'comic-bg': '#121212',
      },
    },
  },
  plugins: [],
};

