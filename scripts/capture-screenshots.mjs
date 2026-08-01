/**
 * Regenerates `public/screenshots/*.png` for the README and the in-app
 * Features/Capabilities page (#495, #497).
 *
 *   node scripts/capture-screenshots.mjs
 *
 * Starts the Vite dev server through its Node API (so nothing is left
 * listening on 5173 if this exits early), seeds demo data through the app's
 * own Settings → Import backup flow, then captures one phone-sized shot per
 * screen. Needs Playwright's Chromium once: `npx playwright install chromium`.
 *
 * Screenshots are documentation / Features illustration, not a test — nothing
 * gates on them. They exist so the README and Capabilities page don't keep
 * drifting years behind the UI.
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
const outputDir = path.join(repoRoot, 'public', 'screenshots')

const VIEWPORT = { width: 430, height: 1250 }

/**
 * `scrollTo` targets the section a shot is meant to be about — without it
 * every screen would just show its own header again.
 */
const SHOTS = [
  { file: 'day.png', route: '/', readyText: 'Breakfast' },
  {
    file: 'day-meals.png',
    route: '/',
    readyText: 'Breakfast',
    scrollTo: 'Meals',
  },
  {
    file: 'goal.png',
    route: '/goal',
    readyText: "This week's target",
  },
  {
    file: 'dashboard.png',
    route: '/dashboard',
    readySelector: '.recharts-responsive-container',
  },
  {
    file: 'correlations.png',
    route: '/dashboard',
    readySelector: '.recharts-responsive-container',
    scrollTo: 'Calories vs. weight change',
  },
  { file: 'history.png', route: '/history', readyText: 'Page 1 of 5' },
  {
    file: 'export.png',
    route: '/settings',
    readyText: 'Export',
    scrollTo: 'Export',
  },
  {
    file: 'appearance.png',
    route: '/settings',
    readyText: 'Appearance',
    scrollTo: 'Appearance',
  },
]

async function main() {
  await mkdir(outputDir, { recursive: true })

  const server = await createServer({
    configFile: path.join(repoRoot, 'vite.config.ts'),
    root: repoRoot,
    server: { port: 5199, strictPort: true },
    logLevel: 'warn',
  })
  await server.listen()
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
  if (!baseUrl) throw new Error('Vite did not report a local URL')

  const seedDir = await mkdtemp(path.join(tmpdir(), 'turtle-screenshots-'))
  const seedFile = path.join(seedDir, 'turtle-steps-demo-backup.json')
  const seedBundle = buildSeedBundle()
  await writeFile(seedFile, JSON.stringify(seedBundle), 'utf8')

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'en-US',
    colorScheme: 'light',
    isMobile: false,
  })
  const preferences = {
    ...SEED_PREFERENCES,
    'turtle-steps-goal-celebration': {
      state: { celebratedWeekStart: seedBundle.goals[0].weekStart },
      version: 0,
    },
  }
  await context.addInitScript((preferences) => {
    for (const [key, value] of Object.entries(preferences)) {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  }, preferences)

  const page = await context.newPage()

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

  for (const shot of SHOTS) {
    await page.goto(`${baseUrl}${shot.route}`, { waitUntil: 'networkidle' })
    if (shot.readyText) {
      await page
        .getByText(shot.readyText, { exact: true })
        .first()
        .waitFor({ timeout: 60_000 })
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
    // Recharts animates on mount; there is no event for "done".
    await page.waitForTimeout(2500)
    const file = path.join(outputDir, shot.file)
    await page.screenshot({ path: file })
    console.log(`wrote ${path.relative(repoRoot, file)}`)
  }

  await context.close()
  await browser.close()
  await server.close()
}

await main()
