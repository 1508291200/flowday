/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 重要度颜色
        importance: {
          1: '#9E9E9E', // 最低
          2: '#4CAF50', // 低
          3: '#FFC107', // 中
          4: '#FF9800', // 高
          5: '#F44336', // 最高
        },
        // 主题色
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      spacing: {
        // 节点间距
        'node-h': '180px',
        'node-v': '40px',
      },
    },
  },
  plugins: [],
};
