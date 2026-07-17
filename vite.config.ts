/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Baked into the running bundle at build time (#115) — compared
    // against public/version.json (written by the deploy workflow with
    // the same commit SHA) to detect when a newer build has been deployed.
    // Falls back to 'dev' locally, where there's no meaningful version to
    // compare against.
    __APP_VERSION__: JSON.stringify(process.env.GITHUB_SHA ?? 'dev'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
})
