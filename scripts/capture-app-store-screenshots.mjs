/**
 * App Store Connect screenshots for #315.
 *
 * Reuses the same demo seed + Settings import path as
 * `scripts/capture-screenshots.mjs` (Features / README shots), but writes
 * exact App Store pixel sizes:
 *
 *   - iPhone Dynamic Island (medium): 1179 × 2556
 *   - iPad 13": 2048 × 2732
 *
 *   node scripts/capture-app-store-screenshots.mjs
 *
 * Needs Playwright Chromium once: `npx playwright install chromium`.
 * Output: `docs/app-store-screenshots/{iphone,ipad}/`.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { buildSeedBundle, SEED_PREFERENCES } from './screenshot-seed.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const outputRoot = path.join(repoRoot, 'docs', 'app-store-screenshots')

/** Logical CSS size × deviceScaleFactor = App Store pixel size. */
const DEVICES = [
  {
    id: 'iphone',
    label: 'iPhone Dynamic Island medium (1179×2556)',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'ipad',
    label: 'iPad 13" (2048×2732)',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
]

/**
 * First shot is the search-results hero. Keep filenames stable for the listing
 * checklist in docs/app-store-listing.md.
 */
const SHOTS = [
  { file: '01-day.png', route: '/', readyText: 'Breakfast' },
  {
    file: '02-day-meals.png',
    route: '/',
    readyText: 'Breakfast',
    scrollTo: 'Meals',
  },
  {
    file: '03-dashboard.png',
    route: '/dashboard',
    readySelector: '.recharts-responsive-container',
  },
  { file: '04-history.png', route: '/history', readyText: /Page \d+ of \d+/i },
  {
    file: '05-export.png',
    route: '/settings',
    readyText: 'Export',
    scrollTo: 'Export',
  },
]

async function seedDemoData(page, baseUrl, seedFile, seedBundle) {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[accept="application/json"]', seedFile)
  await page
    .getByText(/Imported/i)
    .first()
    .waitFor({ timeout: 60_000 })
  const importedEntryCount = await page.evaluate(async () => {
    const request = indexedDB.open('turtle-steps-to-the-goal')
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const countRequest = database
      .transaction('dailyEntries', 'readonly')
      .objectStore('dailyEntries')
      .count()
    return new Promise((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => reject(countRequest.error)
    })
  })
  if (importedEntryCount !== seedBundle.dailyEntries.length) {
    throw new Error(
      `Imported ${importedEntryCount}/${seedBundle.dailyEntries.length} demo entries`,
    )
  }
}

async function captureDevice(browser, baseUrl, seedFile, seedBundle, device) {
  const outDir = path.join(outputRoot, device.id)
  await mkdir(outDir, { recursive: true })

  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    locale: 'en-US',
    colorScheme: 'light',
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
  })
  const weekStart = seedBundle.goals[0].weekStart
  const preferences = {
    ...SEED_PREFERENCES,
    // Match current `goalCelebrationStore` shape (#639/#783) so the
    // "You reached your goal!" modal does not cover App Store shots.
    'turtle-steps-goal-celebration': {
      state: {
        celebratedInProgressWeekStart: weekStart,
        celebratedCompleteWeekStart: weekStart,
        reachedOnLastDayWeekStart: weekStart,
      },
      version: 0,
    },
  }
  await context.addInitScript((prefs) => {
    for (const [key, value] of Object.entries(prefs)) {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  }, preferences)

  const page = await context.newPage()
  await seedDemoData(page, baseUrl, seedFile, seedBundle)

  for (const shot of SHOTS) {
    await page.goto(`${baseUrl}${shot.route}`, { waitUntil: 'networkidle' })
    if (shot.readyText) {
      const locator =
        typeof shot.readyText === 'string'
          ? page.getByText(shot.readyText, { exact: true })
          : page.getByText(shot.readyText)
      await locator.first().waitFor({ timeout: 60_000 })
    }
    if (shot.readySelector) {
      await page
        .locator(shot.readySelector)
        .first()
        .waitFor({ timeout: 60_000 })
    }
    if (shot.scrollTo) {
      await page
        .getByText(shot.scrollTo, { exact: true })
        .first()
        .scrollIntoViewIfNeeded()
    }
    // Safety: dismiss any leftover dialog (celebration, etc.).
    await page.keyboard.press('Escape').catch(() => {})
    const closeBtn = page.getByRole('button', { name: /close/i }).first()
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click()
    }
    // Recharts animates on mount; there is no event for "done".
    await page.waitForTimeout(2500)
    const file = path.join(outDir, shot.file)
    await page.screenshot({ path: file, animations: 'disabled' })
    console.log(`wrote ${path.relative(repoRoot, file)} (${device.label})`)
  }

  await context.close()
}

async function main() {
  await mkdir(outputRoot, { recursive: true })

  const server = await createServer({
    configFile: path.join(repoRoot, 'vite.config.ts'),
    root: repoRoot,
    server: { port: 5198, strictPort: true },
    logLevel: 'warn',
  })
  await server.listen()
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
  if (!baseUrl) throw new Error('Vite did not report a local URL')

  const seedDir = await mkdtemp(path.join(tmpdir(), 'turtle-app-store-ss-'))
  const seedFile = path.join(seedDir, 'turtle-steps-demo-backup.json')
  const seedBundle = buildSeedBundle()
  await writeFile(seedFile, JSON.stringify(seedBundle), 'utf8')

  const browser = await chromium.launch()
  try {
    for (const device of DEVICES) {
      await captureDevice(browser, baseUrl, seedFile, seedBundle, device)
    }
  } finally {
    await browser.close()
    await server.close()
  }
}

await main()
