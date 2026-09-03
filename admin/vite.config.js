import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  // Lire les variables d'environnement depuis le répertoire parent
  // afin de partager les mêmes clés VITE_SUPABASE_* que le site public.
  envDir: '..',
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
