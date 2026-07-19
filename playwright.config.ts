import { defineConfig, devices } from '@playwright/test'

/**
 * Starter E2E suite (#161) — a deliberately small set of black-box,
 * UI-only flows (no direct IndexedDB seeding, unlike the ad hoc scratchpad
 * scripts used for one-off live verification in earlier sessions), scoped
 * to the two flows judged most worth the maintenance cost: daily-log
 * add/edit, and the export/import backup round-trip.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Builds and serves the production bundle rather than the dev server —
  // exercises the same artifact that actually ships (service worker
  // included, #163), and vite preview starts faster than a cold dev-server
  // transform pass would for a CI run that only needs a handful of pages.
  webServer: {
    // Plain `vite build` rather than `npm run build` (which also runs
    // `tsc -b`) -- the type-check already runs as its own separate gate
    // in deploy-pages.yml/ci.yml before this step, so redoing it here
    // would just slow down every local `npm run e2e` for no new coverage.
    command: 'npx vite build && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
