import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'src/frontend-vue',
  base: '/vue-chat/',
  build: {
    outDir: '../../public/vue-chat',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/frontend-vue/index.html'
    }
  },
  server: {
    port: 3003,
    proxy: {
      '/test-chat': 'http://localhost:3001',
      '/chat': 'http://localhost:3001',
      '/check-timeout': 'http://localhost:3001',
      '/force-timeout': 'http://localhost:3001',
      '/api/ejecutivos': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      '/api': 'http://localhost:3001'
    }
  }
})
