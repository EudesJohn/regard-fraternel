import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    open: false,
    port: 5174,
    // L'admin partage des modules avec le site public (../src/lib, ../src/components)
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist'
  }
})
