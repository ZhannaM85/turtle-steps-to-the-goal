import { expect, test, type Page } from '@playwright/test'

/**
 * Multi-screen goal E2E (#690) — expands the #161 Playwright suite with
 * the two flows most likely to catch goal reopen regressions at the UI
 * seam (create → baseline across Goal/Today; Past Targets after a
 * concluded met window). Black-box UI only, no IndexedDB seeding.
 */

function localIsoDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function saveWeightOnDate(
  page: Page,
  isoDate: string,
  weight: string,
): Promise<void> {
  await page.goto('/')
  await page.locator('#log-date').fill(isoDate)
  await page.getByLabel('Weight (kg)').fill(weight)
  await page.getByRole('button', { name: 'Save weight' }).click()
  // Soft unusual-weight confirm if the value looks like a jump vs prior day.
  const saveAnyway = page.getByRole('button', { name: 'Save anyway' })
  if (await saveAnyway.isVisible().catch(() => false)) {
    await saveAnyway.click()
  }
  await expect(page.getByText(weight, { exact: false }).first()).toBeVisible()
}

async function goToGoal(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Goal', exact: true }).click()
  await expect(page).toHaveURL('/goal')
}

async function goToToday(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Day', exact: true }).click()
  await expect(page).toHaveURL('/')
}

test('creates a goal and keeps the baseline visible on Goal and Today', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Weight (kg)').fill('58.65')
  await page.getByRole('button', { name: 'Save weight' }).click()

  await goToGoal(page)

  await page.getByLabel("This week's target (kg to lose)").fill('0.2')
  await page.getByRole('button', { name: 'Set this week’s target' }).click()

  // Goal card shows the frozen baseline (#676 / #675).
  await expect(page.getByText(/from 58\.65 kg/)).toBeVisible()

  await goToToday(page)
  await expect(page.getByText(/from 58\.65 kg/)).toBeVisible()
})

test('Past Targets marks a concluded met window as reached', async ({
  page,
}) => {
  // Window fully in the past so #678 includes it in Past Targets without
  // waiting for a last-day reach.
  const weekStart = localIsoDaysAgo(10)
  const midWindow = localIsoDaysAgo(7)
  const weekEnd = localIsoDaysAgo(4)

  await saveWeightOnDate(page, weekStart, '60')
  await saveWeightOnDate(page, midWindow, '59.5')

  await goToGoal(page)

  await page.getByLabel("This week's target (kg to lose)").fill('0.5')
  await page.getByLabel('Starts on').fill(weekStart)
  await page.getByLabel('Ends on').fill(weekEnd)
  await page.getByRole('button', { name: 'Set this week’s target' }).click()

  await expect(
    page.getByRole('heading', { name: 'Past targets' }),
  ).toBeVisible()
  // 60 → 59.5 meets a 0.5 kg/week target (#681 / finalTargetMet).
  await expect(page.getByText(/Target met/)).toBeVisible()
})
