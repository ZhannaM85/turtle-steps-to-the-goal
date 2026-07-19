import { expect, test } from '@playwright/test'

/**
 * Starter E2E coverage (#161) for the app's most-used flow: logging a
 * meal, then editing it via the dedicated MealEditScreen route (#157).
 * Pure UI interaction, no direct IndexedDB seeding — each Playwright test
 * gets a fresh, isolated browser context, so there's nothing to clean up.
 */
test('logs a meal, then edits its calories via the pencil', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '+ Add item' }).click()
  await page.getByLabel('kcal/100g').fill('300')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Breakfast — 300 kcal')).toBeVisible()

  await page.getByRole('button', { name: 'Edit meal 1' }).click()
  await expect(page).toHaveURL(/\/entry\/.+\/meal\/.+/)
  await expect(
    page.getByRole('heading', { name: 'Edit meal' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Edit item' }).click()
  const itemSheet = page.getByRole('dialog')
  const kcalField = itemSheet.getByLabel('kcal/100g')
  await kcalField.fill('450')
  await itemSheet.getByRole('button', { name: 'Save', exact: true }).click()

  await page.getByRole('button', { name: 'Save', exact: true }).click()

  // MealEditScreen navigates back to Today once the focused meal's edit
  // ends (#157's onFocusedMealDone) — the updated total should show there.
  await expect(page).toHaveURL('/')
  await expect(page.getByText('Breakfast — 450 kcal')).toBeVisible()
  await expect(page.getByText('Breakfast — 300 kcal')).not.toBeVisible()
})
