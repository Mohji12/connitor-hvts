/** @type {import('tailwindcss').Config} */
module.exports = {
  // Required for NativeWind / css-interop on web (avoids "dark mode is type 'media'" crash)
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: '#001B71',
        accent: '#4A90E2',
        canvas: '#F7F9FC',
      },
    },
  },
  plugins: [],
};
