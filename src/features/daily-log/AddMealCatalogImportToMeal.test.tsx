import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCatalogFoodImportStore, useFoodOverrideStore, useMealItemStore, useRecipeStore } from '@/stores'
import { AddMealDialog } from './AddMealDialog'
import { openAddMealAction } from './openAddMealAction'

const mousse = {
  nameRu: 'Вишнёвый мусс',
  nameEn: 'Cherry mousse',
  brand: 'Test brand',
  barcode: '1234567890123',
  caloriesPer100g: 58,
  proteinPer100g: 1.2,
  fatPer100g: 0.2,
  carbsPer100g: 13,
}

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  await db.dailyEntries.clear()
  useCatalogFoodImportStore.setState({ imports: [], status: 'idle', error: null })
  useMealItemStore.setState({ items: [], status: 'ready', error: null })
  useRecipeStore.setState({ recipes: [], status: 'ready', error: null })
  useFoodOverrideStore.setState({ overrides: [], status: 'ready', error: null })
})

function renderMeal() {
  const onAppendItems = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <AddMealDialog
      open onOpenChange={onOpenChange}
      mealLabel="Lunch" onMealLabelChange={vi.fn()}
      timeEaten="12:30" onTimeEatenChange={vi.fn()}
      note="Keep this note" onNoteChange={vi.fn()}
      items={[{ id: 'existing', name: 'Existing food', amountKcal: 100 }]}
      reaction={undefined} onReactionChange={vi.fn()}
      onAppendItems={onAppendItems} onRemoveItem={vi.fn()}
    />,
  )
  return { onAppendItems, onOpenChange }
}

async function importJson(user: ReturnType<typeof userEvent.setup>, value: unknown) {
  await user.click(await openAddMealAction(user, 'Import JSON'))
  fireEvent.change(screen.getByRole('textbox', { name: 'Import catalog foods' }), {
    target: { value: JSON.stringify(value) },
  })
  await user.click(screen.getByRole('button', { name: 'Import foods' }))
}

describe('Add imported catalog food to the current meal (#1086)', () => {
  it('only adds on portion confirmation and keeps batch choices and the current meal', async () => {
    const user = userEvent.setup()
    const { onAppendItems, onOpenChange } = renderMeal()
    await importJson(user, [mousse, {
      ...mousse, nameRu: 'Другой десерт', nameEn: 'Other dessert', barcode: null,
    }, { nameRu: 'Invalid food' }])

    const addMousse = await screen.findByRole('button', {
      name: 'Add to current meal — Cherry mousse',
    })
    expect(screen.getByRole('button', { name: 'Add to current meal — Other dessert' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add to current meal — Invalid/ })).not.toBeInTheDocument()
    expect(onAppendItems).not.toHaveBeenCalled()

    await user.click(addMousse)
    expect(await screen.findByLabelText('Dish name')).toHaveValue('Cherry mousse')
    expect(screen.getByLabelText('Brand (optional)')).toHaveValue('Test brand')
    await user.click(screen.getByRole('radio', { name: 'Portion' }))
    await user.clear(screen.getByLabelText('Weight (g)'))
    await user.type(screen.getByLabelText('Weight (g)'), '200')
    expect(onAppendItems).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onAppendItems).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Cherry mousse', brand: 'Test brand', amountG: 200,
        amountKcal: 116, proteinG: 2.4, fatG: 0.4, carbsG: 26,
      }),
    ]))
    await user.click(await screen.findByRole('button', { name: 'Add to current meal — Other dessert' }))
    expect(await screen.findByLabelText('Dish name')).toHaveValue('Other dessert')
    await user.click(screen.getByRole('button', { name: 'Close item editor' }))
    expect(onAppendItems).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText('Existing food', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meal name' })).toHaveTextContent('Lunch')
    expect(screen.getByDisplayValue('12:30')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('offers the saved updated food and drops old suggestions when the paste changes', async () => {
    await useCatalogFoodImportStore.getState().importFoods([{
      nameRu: mousse.nameRu, barcode: mousse.barcode,
      kcal100: 10, protein100: 1, fat100: 1, carbs100: 1,
      cholesterolImpact: 'neutral',
    }])
    const user = userEvent.setup()
    renderMeal()
    await importJson(user, mousse)
    expect(await screen.findByText('Added 0, updated 1.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add to current meal — Cherry mousse' }))
    expect(await screen.findByLabelText('Dish name')).toHaveValue('Cherry mousse')
    expect(screen.getByLabelText('kcal/100g')).toHaveValue('58')
    await user.click(screen.getByRole('button', { name: 'Close item editor' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Import catalog foods' }), {
      target: { value: '{' },
    })
    await user.click(screen.getByRole('button', { name: 'Import foods' }))
    expect(await screen.findByText('That text is not valid JSON.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add to current meal/ })).not.toBeInTheDocument()
  })
})
