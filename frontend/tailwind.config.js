/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kds: {
          bg: '#0d0f14',
          surface: '#161921',
          card: '#1e222d',
          border: '#2a2f3e',
          new: '#3b82f6',
          preparing: '#f59e0b',
          ready: '#10b981',
          completed: '#6b7280',
          delayed: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
