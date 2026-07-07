/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#179237',
          foreground: '#ffffff',
          hover: '#137a2e',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f5f5f5',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT: '#f5f5f5',
          foreground: '#111827',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#111827',
        },
        background: '#ffffff',
        foreground: '#111827',
        border: '#e5e4e7',
        input: '#e5e4e7',
        ring: '#179237',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
      fontFamily: {
        sans: ['Raleway', 'sans-serif'],
        heading: ['GT Esti Pro Display', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

