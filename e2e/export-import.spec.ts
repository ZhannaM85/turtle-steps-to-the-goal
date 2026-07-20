import { expect, test } from '@playwright/test'

/**
 * Starter E2E coverage (#161) for the backup round-trip: log data, export
 * it, wipe the local database (via #164's "Clear all data", not a fresh
 * browser context — exercises a real in-app affordance instead), then
 * import the same file back and confirm the data actually reappears.
 * Import merges rather than overwrites (per the in-app copy), so wiping
 * first is what makes this a meaningful round-trip check rather than a
 * no-op.
 */
test('exports a backup, clears all data, then re-imports it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Add item' }).click()
  await page.getByLabel('kcal/100g').fill('300')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Breakfast — 300 kcal')).toBeVisible()

  await page.goto('/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloadPromise
  const backupPath = await download.path()
  expect(backupPath).not.toBeNull()

  await page.getByRole('button', { name: 'Clear all data' }).click()
  // The confirm button triggers a same-URL `window.location.reload()`
  // (ClearAllDataSection.tsx) once IndexedDB is cleared. `waitForURL`
  // alone can resolve immediately here since the URL never changes
  // (already '/settings'), without actually waiting for that reload to
  // finish — racing the very next `page.goto('/')` against the app's
  // still in-flight reload, intermittently aborting one or the other
  // navigation. Waiting for the resulting `load` event instead blocks
  // until the reload has genuinely completed.
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Yes, delete everything' }).click(),
  ])
  await page.waitForURL('/settings')

  await page.goto('/')
  await expect(page.getByText('Breakfast — 300 kcal')).not.toBeVisible()

  await page.goto('/settings')
  await page.locator('input[type="file"]').setInputFiles(backupPath!)
  await expect(page.getByText(/^Imported /)).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('Breakfast — 300 kcal')).toBeVisible()
})
