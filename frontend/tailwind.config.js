/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF1F1',
          100: '#FFDDDD',
          200: '#FFB4B4',
          300: '#FF8A8A',
          500: '#E40000',
          600: '#C20000',
          700: '#9F0000',
          800: '#7A0000'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
