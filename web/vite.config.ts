import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: [
      'profile.mazhaofeng.com',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 优化构建输出
    rollupOptions: {
      output: {
        // 手动分包，将大图片分离
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
        // 优化资源文件名
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash][extname]`
          }
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
    // 启用压缩（使用 esbuild，更快且默认配置已足够）
    minify: 'esbuild',
    // 增加 chunk 大小警告阈值（因为图片较大）
    chunkSizeWarningLimit: 2000,
  },
})
