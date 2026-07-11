/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          dark: '#0A0A0A',
          gray: {
            950: '#111111',
            900: '#1A1A1A',
            800: '#2A2A2A',
            700: '#3A3A3A',
            600: '#555555',
            500: '#777777',
            400: '#999999',
            300: '#BBBBBB',
            200: '#DDDDDD',
            100: '#EEEEEE',
            50: '#F5F5F5',
          },
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        heading: ['Axiforma', 'sans-serif'],
        body: ['Lora', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
