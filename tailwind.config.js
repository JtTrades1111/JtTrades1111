/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dashboard surface palette (dark mode default)
        ink: {
          900: '#0a0e1a',
          800: '#0f1525',
          700: '#161d30',
          600: '#1e2740',
          500: '#2a3450',
        },
        accent: {
          DEFAULT: '#6366f1',
          soft: '#818cf8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
