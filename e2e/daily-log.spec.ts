import { expect, test } from '@playwright/test'

/**
 * Starter E2E coverage (#161) for the app's most-used flow: logging a
 * meal, then editing it via the in-place AddMealDialog overlay (#461 —
 * previously a dedicated MealEditScreen route under #157).
 * Pure UI interaction, no direct IndexedDB seeding — each Playwright test
 * gets a fresh, isolated browser context, so there's nothing to clean up.
 */
test('logs a meal, then edits its calories via the pencil', async ({ page }) => {
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

  await expect(page.getByText('Breakfast — 300 kcal')).toBeVisible()

  // #461 — pencil opens AddMealDialog as a state-controlled overlay on the
  // same page (no /entry/:date/meal/:mealId navigation), so the URL stays
  // on Today throughout.
  await page.getByRole('button', { name: 'Edit meal 1' }).click()
  await expect(page).toHaveURL('/')
  const editDialog = page.getByRole('dialog', { name: 'Breakfast' })
  await expect(editDialog).toBeVisible()

  await editDialog.getByRole('button', { name: 'Edit item' }).click()
  // The per-item editor is its own nested Dialog stacked on top of
  // editDialog, so both are `role=dialog` at once — scope by title to
  // avoid an ambiguous match.
  const itemSheet = page.getByRole('dialog', { name: 'Edit item' })
  // Editing an already-saved item opens in "Portion" mode (startEditItem's
  // macroMode: 'perPortion'), where the field is plain "kcal" rather than
  // the "kcal/100g" rate field the 100g-mode manual-add flow uses.
  const kcalField = itemSheet.getByLabel('kcal', { exact: true })
  await kcalField.fill('450')
  await itemSheet.getByRole('button', { name: 'Save', exact: true }).click()

  // #459's sticky footer button is "Done" in both the add and edit flows
  // (no separate "Save" action for an already-saved meal anymore).
  await editDialog.getByRole('button', { name: 'Done' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByText('Breakfast — 450 kcal')).toBeVisible()
  await expect(page.getByText('Breakfast — 300 kcal')).not.toBeVisible()
})
