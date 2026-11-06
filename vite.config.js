import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        'fetch-content': resolve(__dirname, 'src/scripts/indeed/fetch-content.js'),
        background: resolve(__dirname, 'src/background.js')
      }
    }
  },
  plugins: [react()]
})
