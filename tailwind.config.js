export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F7F2',
          100: '#DCEAE0',
          200: '#B8D5C1',
          300: '#8FB89C',
          400: '#5F8F70',
          500: '#3D6B4D',
          600: '#1B4332',
          700: '#163627',
          800: '#0F2419',
          900: '#08120E',
        },
        gold: {
          50: '#FBF8F1',
          100: '#F5EEDB',
          200: '#E8D9B3',
          300: '#DBC48B',
          400: '#C9A961',
          500: '#B08F4A',
          600: '#8C7239',
        },
      },
    },
  },
  plugins: [],
}