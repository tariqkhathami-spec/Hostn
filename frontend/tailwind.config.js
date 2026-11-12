/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Helpers in src/lib may also declare Tailwind classes (e.g. pricing.ts
    // exports DISCOUNT_COLORS). Scan them so JIT generates those classes.
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eefaf4',
          100: '#d6f3e4',
          200: '#b0e6cc',
          300: '#7dd2ae',
          400: '#48b78c',
          500: '#259c73',
          600: '#177d5c',
          700: '#14644b',
          800: '#124f3d',
          900: '#0f4133',
          950: '#06231b',
        },
        gold: {
          50: '#fff9eb',
          100: '#feefc7',
          200: '#fddc8a',
          300: '#fcc44d',
          400: '#fbad24',
          500: '#f08c0a',
          600: '#d46a05',
          700: '#b04a08',
          800: '#8f390d',
          900: '#752f0e',
        },
        hostn: {
          purple: '#14644b',
          gold: '#f08c0a',
          cream: '#faf8f5',
          dark: '#06231b',
          light: '#eefaf4',
        },
      },
      fontFamily: {
        sans: ['Rubik', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        'display-ar': ['Noto Kufi Arabic', 'Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.12)',
        'premium': '0 4px 30px rgba(20, 100, 75, 0.15)',
        'premium-lg': '0 10px 60px rgba(20, 100, 75, 0.2)',
        'gold': '0 4px 20px rgba(240, 140, 10, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, rgba(6, 35, 27, 0.92) 0%, rgba(15, 65, 51, 0.85) 40%, rgba(20, 100, 75, 0.7) 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #f08c0a 0%, #fcc44d 50%, #f08c0a 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
