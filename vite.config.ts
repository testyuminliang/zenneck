import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main:               resolve(__dirname, 'index.html'),
        zen:                resolve(__dirname, 'zen.html'),
        popup:              resolve(__dirname, 'popup.html'),
        'background/worker': resolve(__dirname, 'src/extension/background/worker.ts'),
        'content/overlay':  resolve(__dirname, 'src/extension/content/overlay.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name.includes('/') ? '[name].js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
