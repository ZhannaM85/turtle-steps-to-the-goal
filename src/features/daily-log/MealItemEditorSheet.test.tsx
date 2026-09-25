import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useLocaleStore } from '@/i18n'
import { MealItemEditorSheet } from './MealItemEditorSheet'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderSheet() {
  render(
    <MealItemEditorSheet
      open
      onOpenChange={vi.fn()}
      title="Добавить блюдо"
      name="Гуляш"
      onNameChange={vi.fn()}
      brand=""
      onBrandChange={vi.fn()}
      amount="110"
      onAmountChange={vi.fn()}
      protein="9"
      onProteinChange={vi.fn()}
      fat="5"
      onFatChange={vi.fn()}
      carbs="8"
      onCarbsChange={vi.fn()}
      fiber=""
      onFiberChange={vi.fn()}
      showFiber
      amountG="1"
      onAmountGChange={vi.fn()}
      macroMode="per100g"
      onMacroModeChange={vi.fn()}
      mealItems={[]}
      onSelectMealItem={vi.fn()}
      emotion={undefined}
      onEmotionChange={vi.fn()}
      favorite={false}
      onFavoriteChange={vi.fn()}
      note=""
      onNoteChange={vi.fn()}
      onSave={vi.fn()}
    />,
  )
}

describe('MealItemEditorSheet nutrition row (#990)', () => {
  it('keeps protein, fat, and carbs on one row in Russian', () => {
    useLocaleStore.getState().setLocale('ru')
    renderSheet()

    const protein = screen.getByRole('textbox', { name: 'Белки' })
    const fat = screen.getByRole('textbox', { name: 'Жиры' })
    const carbs = screen.getByRole('textbox', { name: 'Углеводы' })
    const macroRow = protein.closest('.grid')

    expect(macroRow).toBe(fat.closest('.grid'))
    expect(macroRow).toBe(carbs.closest('.grid'))
    expect(macroRow).toHaveClass('grid-cols-3')
    expect(macroRow).not.toHaveClass('grid-cols-2')

    for (const field of [protein, fat, carbs]) {
      expect(field).toHaveClass('h-12')
      expect(field.previousElementSibling).toHaveClass('whitespace-nowrap')
      expect(field.previousElementSibling).toHaveClass('text-xs')
    }

    const fiber = screen.getByRole('textbox', { name: 'Клетчатка' })
    expect(fiber.closest('.grid')).not.toBe(macroRow)
    expect(fiber.closest('.grid')).toHaveClass('grid-cols-2')
  })
})
