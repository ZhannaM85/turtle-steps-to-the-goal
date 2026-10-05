import { expect, test } from '@playwright/test'

test('adds an imported food through its portion editor without searching (#1086)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Add a meal' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Import JSON' }).click()
  const importDialog = page.getByRole('dialog', { name: 'Import catalog foods' })
  await importDialog.getByLabel('Import catalog foods').fill(JSON.stringify([
    {
      nameRu: 'Вишнёвый мусс', nameEn: 'Cherry mousse',
      caloriesPer100g: 58, proteinPer100g: 1.2, fatPer100g: 0.2, carbsPer100g: 13,
    },
    {
      nameRu: 'Другой десерт', nameEn: 'Other dessert',
      caloriesPer100g: 100, proteinPer100g: 1, fatPer100g: 1, carbsPer100g: 20,
    },
  ]))
  await importDialog.getByRole('button', { name: 'Import foods', exact: true }).click()
  await importDialog.getByRole('button', { name: 'Add to current meal — Cherry mousse' }).click()
  const itemSheet = page.getByRole('dialog', { name: 'Add item', exact: true })
  await expect(itemSheet.getByLabel('Dish name')).toHaveValue('Cherry mousse')
  await itemSheet.getByLabel('× 100g').fill('2')
  await itemSheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(importDialog.getByRole('button', { name: 'Add to current meal — Other dessert' })).toBeVisible()
  await importDialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  const mealCard = page.getByRole('listitem').filter({ hasText: 'Breakfast' })
  await expect(mealCard.getByText('Cherry mousse', { exact: false })).toBeVisible()
  await expect(mealCard.getByText('116 kcal', { exact: false }).first()).toBeVisible()
  await expect(mealCard.getByText('Other dessert', { exact: false })).toHaveCount(0)
})

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
  // #1060 — those cards are one Add… menu; Add food is still that handler.
  // #691 — empty day uses "+ Add a meal" (not "another").
  await page.getByRole('button', { name: '+ Add a meal' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Add food' }).click()
  await page.getByLabel('kcal/100g').fill('300')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()

  // #473 — the card's header is the meal label alone now; its calorie
  // total moved onto a separate line within the same card, so this checks
  // both inside the card rather than matching one combined string.
  const mealCard = page.getByRole('listitem').filter({ hasText: 'Breakfast' })
  await expect(mealCard.getByText('300 kcal').first()).toBeVisible()

  // #461 — pencil opens AddMealDialog as a state-controlled overlay on the
  // same page (no /entry/:date/meal/:mealId navigation), so the URL stays
  // on Today throughout.
  await page.getByRole('button', { name: 'Edit meal 1' }).click()
  await expect(page).toHaveURL('/')
  const editDialog = page.getByRole('dialog', { name: 'Add a meal' })
  await expect(editDialog).toBeVisible()

  await editDialog.getByRole('button', { name: 'Edit item' }).click()
  // The per-item editor is its own nested Dialog stacked on top of
  // editDialog, so both are `role=dialog` at once — scope by title to
  // avoid an ambiguous match.
  const itemSheet = page.getByRole('dialog', { name: 'Edit item' })
  // #981 — editing an already-saved item opens on 100 g. This row was
  // logged as 300 kcal at the default 1 × 100 g, so the rate field is
  // still 300; filling 450 replaces that rate.
  const kcalField = itemSheet.getByLabel('kcal/100g')
  await kcalField.fill('450')
  await itemSheet.getByRole('button', { name: 'Save', exact: true }).click()

  // #459's sticky footer button is "Done" in both the add and edit flows
  // (no separate "Save" action for an already-saved meal anymore).
  await editDialog.getByRole('button', { name: 'Done' }).click()

  await expect(page).toHaveURL('/')
  await expect(mealCard.getByText('450 kcal').first()).toBeVisible()
  await expect(page.getByText('300 kcal')).toHaveCount(0)
})
