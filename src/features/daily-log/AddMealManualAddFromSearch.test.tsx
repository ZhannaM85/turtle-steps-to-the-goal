import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  useAddMealRecentVisibilityStore,
  useEatingReasonTrackingStore,
  useFoodOverrideStore,
  useMealItemStore,
  useMealLabelPresetStore,
  useNutritionFactsStore,
  useRecipeStore,
} from '@/stores'
import { AddMealDialog } from './AddMealDialog'

const QUERY = 'Медово-ореховый пирог'

beforeEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
  useAddMealRecentVisibilityStore.setState({ recentVisible: true })
  useMealLabelPresetStore.setState({ presets: [] })
  useNutritionFactsStore.setState({ enabled: false })
  useEatingReasonTrackingStore.setState({
    enabled: false,
    customReasons: [],
    builtinLabelOverrides: {},
  })
})

function renderDialog() {
  render(
    <AddMealDialog
      open
      onOpenChange={vi.fn()}
      mealLabel="Breakfast"
      onMealLabelChange={vi.fn()}
      timeEaten="08:00"
      onTimeEatenChange={vi.fn()}
      items={[]}
      reaction={undefined}
      onAppendItems={vi.fn()}
      onRemoveItem={vi.fn()}
      onReactionChange={vi.fn()}
      note=""
      onNoteChange={vi.fn()}
      todayTotals={{ kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 }}
    />,
  )
}

describe('manual add from empty meal search (#992)', () => {
  it('fills Dish name with the search query and keeps it editable', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole('textbox', { name: 'Search foods' }), QUERY)
    await user.click(screen.getByRole('button', { name: 'Add manually' }))

    const name = await screen.findByRole('combobox', { name: 'Dish name' })
    expect(name).toHaveValue(QUERY)

    await user.clear(name)
    await user.type(name, 'Edited pie')
    expect(name).toHaveValue('Edited pie')
  })

  it('does not copy the search into Dish name from the Add food shortcut', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole('textbox', { name: 'Search foods' }), QUERY)
    await user.click(screen.getByRole('button', { name: 'Add food' }))

    const name = await screen.findByRole('combobox', { name: 'Dish name' })
    expect(name).toHaveValue('')
  })
})
