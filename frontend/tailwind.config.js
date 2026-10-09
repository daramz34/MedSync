/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          tint: '#EEF4FF',
          border: '#C9D8F5',
          disabled: '#9DB5F2',
        },
        danger: {
          DEFAULT: '#C62828',
          hover: '#A61F1F',
          tint: '#FFF1F0',
          border: '#F0D0CE',
        },
        surface: '#FFFFFF',
        background: '#F4F6F8',
        ink: '#202B36',
        muted: '#667085',
        line: '#D9E0E7',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter',
          '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: { md: '12px', lg: '16px' },
      boxShadow: {
        sm: '0 1px 2px rgb(16 24 40 / 6%)',
        md: '0 4px 12px rgb(16 24 40 / 8%)',
        lg: '0 12px 32px rgb(16 24 40 / 10%)',
      },
    },
  },
  plugins: [],
}
