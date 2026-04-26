/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0a0a0f', card: '#12121a', hover: '#1a1a2e' },
        accent: { DEFAULT: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        border: '#1e1e2e',
      },
    },
  },
  plugins: [],
}
