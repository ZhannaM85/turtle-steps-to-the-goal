import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { defaultExclude } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // #500 — `officecrypto-tool` (MS-OFFCRYPTO decrypt for password-
    // protected MyFitnessPal .xlsx) reads Node's `crypto`/`buffer` and
    // touches `process` at module scope, so the browser needs all three
    // shimmed or the decrypt chunk throws "process is not defined".
    // Skipped under Vitest (`mode === 'test'`), which already runs in real
    // Node: the shim's `process.cwd()` returns '/', which would break
    // node-side test code such as `theme.contrast.test.ts`'s CSS read.
    ...(mode === 'test'
      ? []
      : [
          nodePolyfills({
            include: ['buffer', 'crypto', 'stream', 'vm'],
            globals: { Buffer: true, global: true, process: true },
          }),
        ]),
    // Offline support / instant cold loads (#163) — precaches the built
    // app shell (JS/CSS/HTML/icons) via a generated Workbox service
    // worker, so the app loads without a live network fetch once it's
    // been opened at least once. manifest: false since public/manifest.json
    // already exists (#103, with #102's fix for relative start_url/scope/
    // icon paths under the GitHub Pages subpath) and index.html already
    // links it directly — this plugin only needs to add the service
    // worker, not generate a second manifest.
    VitePWA({
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        // version.json (#115) must always be a real network fetch, never
        // served from the SW's cache — it's how useAppUpdateAvailable()
        // detects a newer deploy exists at all. Excluding it from the
        // precache manifest is enough: with no matching runtime-caching
        // rule either, the SW's fetch handler never intercepts it.
        // #270 — exceljs (Excel export chunk)
        // #500 — officecrypto-tool (password-protected MyFitnessPal decrypt)
        // Both are already lazy-imported and only needed when those
        // export/import flows run; excluding them from the SW precache
        // keeps routine update downloads smaller.
        // #497: Features/Capabilities screenshots live in public/screenshots
        // and are only needed on /features — keep them out of the SW precache
        // so routine app updates don't re-download ~1.6MB of PNGs.
        globIgnores: [
          'version.json',
          '**/exceljs*.js',
          '**/officecrypto-tool*.js',
          'screenshots/**',
        ],
      },
    }),
  ],
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
    // e2e/ (#161) holds Playwright specs, run via `npm run e2e`
    // (playwright.config.ts), not Vitest — they use Playwright's own
    // test()/expect(), which crashes if Vitest's default **/*.spec.ts
    // glob picks them up too. Spreading defaultExclude rather than
    // hardcoding it, since providing `exclude` replaces Vitest's own
    // default list entirely rather than merging with it.
    exclude: [...defaultExclude, 'e2e/**'],
  },
}))
