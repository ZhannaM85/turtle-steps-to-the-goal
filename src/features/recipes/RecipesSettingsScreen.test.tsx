import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useRecipeStore } from '@/stores'
import { RecipesSettingsScreen } from './RecipesSettingsScreen'

beforeEach(async () => {
  await db.recipes.clear()
  await db.mealItems.clear()
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.recipes.clear()
  await db.mealItems.clear()
})

function renderScreen() {
  return render(<RecipesSettingsScreen />, { wrapper: MemoryRouter })
}

describe('RecipesSettingsScreen', () => {
  it('shows an empty state with no recipes yet', async () => {
    renderScreen()

    expect(
      await screen.findByText('Nothing yet — add a recipe to log servings of it later.'),
    ).toBeInTheDocument()
  })

  it('creates a new recipe end to end', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Add recipe' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Recipe name'), 'Chili')
    await user.type(
      within(dialog).getByLabelText('Ingredient name'),
      'Ground beef',
    )
    await user.type(within(dialog).getByLabelText('kcal/100g'), '250')
    await user.click(
      within(dialog).getByRole('button', { name: 'Add ingredient' }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Chili')).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.recipes.toArray())[0]).toMatchObject({ name: 'Chili' }),
    )
  })

  it('edits an existing recipe', async () => {
    await db.recipes.put({
      id: 'recipe-1',
      name: 'Chili',
      servings: 4,
      ingredients: [{ id: 'ing-1', name: 'Ground beef', amountKcal: 800 }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    renderScreen()

    await screen.findByText('Chili')
    await user.click(screen.getByRole('button', { name: 'Edit Chili' }))
    const dialog = screen.getByRole('dialog')
    const servingsInput = within(dialog).getByLabelText('Servings')
    await user.clear(servingsInput)
    await user.type(servingsInput, '6')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(async () =>
      expect((await db.recipes.toArray())[0]).toMatchObject({ servings: 6 }),
    )
  })

  it('deletes a recipe', async () => {
    await db.recipes.put({
      id: 'recipe-1',
      name: 'Chili',
      servings: 4,
      ingredients: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    renderScreen()

    await screen.findByText('Chili')
    await user.click(screen.getByRole('button', { name: 'Delete Chili' }))

    await waitFor(() => expect(screen.queryByText('Chili')).not.toBeInTheDocument())
    expect(await db.recipes.toArray()).toEqual([])
  })
})
