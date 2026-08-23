/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FEFBF6',
        neo: {
          yellow: '#FFDD00',
          blue: '#7EB7FF',
          green: '#7CFF7C',
          red: '#FF5252',
          pink: '#FF7EB3',
          purple: '#C4A8FF',
          orange: '#FFAB40',
        },
      },
      boxShadow: {
        brutal: '5px 5px 0px #000',
        'brutal-sm': '3px 3px 0px #000',
        'brutal-hover': '2px 2px 0px #000',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
