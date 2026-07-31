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
  // #454 — the add-row accordion became a dedicated flyout: open it, then
  // fall back to manual entry (the direct successor of the old "+ Add
  // item" button, which no longer exists on the main page itself). #459
  // replaced the empty-search state's plain "Can't find it? Add manually"
  // link with a row of quick-action cards — "Add food" is the same handler.
  await page.getByRole('button', { name: '+ Add another meal' }).click()
  await page.getByRole('button', { name: 'Add food' }).click()
  await page.getByLabel('kcal/100g').fill('300')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  // #473 — the meal label and its calorie total are separate lines within
  // the card now, so the round-trip is checked via the total alone.
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'Breakfast' })
      .getByText('300 kcal')
      .first(),
  ).toBeVisible()

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
  await expect(page.getByText('300 kcal')).toHaveCount(0)

  await page.goto('/settings')
  // Scoped to the JSON backup input specifically (#365 added a second
  // `input[type="file"]` for the Zepp Life zip import, right below this
  // one — an unscoped locator now matches both and fails strict mode).
  await page
    .locator('input[type="file"][accept="application/json"]')
    .setInputFiles(backupPath!)
  await expect(page.getByText(/^Imported /)).toBeVisible()

  await page.goto('/')
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'Breakfast' })
      .getByText('300 kcal')
      .first(),
  ).toBeVisible()
})
