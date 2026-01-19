/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          accent: '#145885', // Blue accent - Tarchier brand color
          dark: '#0A0A0A', // Off-black background
          cream: '#FAFAFA', // Off-white
          beige: '#F5F5F5',
          latte: '#F0F0F0',
          espresso: '#145885',
          light: '#1A1A1A',
          // Tarchier Discounted Shop theme colors
          primary: '#145885', // Blue primary - Tarchier brand
          secondary: '#1E6FA3', // Slightly lighter blue
          darkBg: '#FAFAFA', // Off-white main background
          darkCard: '#FFFFFF', // White card background
          glass: 'rgba(20, 88, 133, 0.1)', // Glass effect with accent color
          text: '#1A1A1A', // Dark text for light background
          textMuted: '#666666' // Muted text
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};