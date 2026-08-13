/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apollo: {
          navy: '#064B6B',
          navyDark: '#04344B',
          navyLight: '#0A5C82',
          teal: '#1789A5',
          tealLight: '#1EB0D4',
          cyan: '#27B8D5',
          gold: '#FBB91B',
          goldHover: '#E5A40F',
          goldDark: '#D49400',
          dark: '#12303D',
          light: '#F5F8FA',
          gray: '#EBF1F5',
          border: '#D3E2EA'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif']
      },
      boxShadow: {
        'apollo': '0 10px 25px -5px rgba(6, 75, 107, 0.08), 0 8px 10px -6px rgba(6, 75, 107, 0.05)',
        'apollo-lg': '0 20px 30px -10px rgba(6, 75, 107, 0.12), 0 10px 15px -5px rgba(6, 75, 107, 0.08)',
        'gold': '0 4px 14px 0 rgba(251, 185, 27, 0.39)',
      }
    },
  },
  plugins: [],
}
