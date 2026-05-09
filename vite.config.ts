import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // 分离 React 相关库
          'vendor-react': ['react', 'react-dom'],
          // 分离状态管理
          'vendor-zustand': ['zustand'],
          // 分离数据可视化库
          'vendor-flow': ['reactflow'],
          // 分离工具库
          'vendor-utils': ['date-fns'],
        },
      },
    },
  },
});
