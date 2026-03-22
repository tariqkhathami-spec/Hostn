/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf8ff',
          100: '#f3edff',
          200: '#e8dffe',
          300: '#d4c4fc',
          400: '#b794f6',
          500: '#9461e5',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5521a5',
          900: '#3b1578',
          950: '#1e0a3e',
        },
        gold: {
          50: '#fefdf4',
          100: '#fdf8e1',
          200: '#faeeb8',
          300: '#f5e08a',
          400: '#e8c94a',
          500: '#d4af37',
          600: '#b8942a',
          700: '#9a7a22',
          800: '#7d6320',
          900: '#5e4a18',
        },
        hostn: {
          purple: '#6d28d9',
          gold: '#d4af37',
          cream: '#faf8f5',
          dark: '#1a0e2e',
          light: '#faf8ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 2px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.12)',
        'premium': '0 4px 30px rgba(109, 40, 217, 0.15)',
        'premium-lg': '0 10px 60px rgba(109, 40, 217, 0.2)',
        'gold': '0 4px 20px rgba(212, 175, 55, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, rgba(26, 14, 46, 0.92) 0%, rgba(59, 21, 120, 0.85) 40%, rgba(109, 40, 217, 0.7) 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #d4af37 0%, #f5e08a 50%, #d4af37 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'shimmer': 'shimmer 2.5s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
