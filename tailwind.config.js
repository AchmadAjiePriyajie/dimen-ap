/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0b1f3a', light: '#14325c', dark: '#071426' },
        gold: { DEFAULT: '#c9a227', light: '#e6c65a', dark: '#9c7c14' },
      },
    },
  },
  plugins: [],
};
