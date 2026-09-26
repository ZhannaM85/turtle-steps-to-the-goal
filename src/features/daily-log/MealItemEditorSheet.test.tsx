import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocaleStore } from '@/i18n'
import { MealItemEditorSheet } from './MealItemEditorSheet'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function sheetElement(brand = '') {
  return (
    <MealItemEditorSheet
      open
      onOpenChange={vi.fn()}
      title="Добавить блюдо"
      name="Гуляш"
      onNameChange={vi.fn()}
      brand={brand}
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
    />
  )
}

function renderSheet(brand = '') {
  return render(sheetElement(brand))
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

describe('MealItemEditorSheet brand disclosure (#993)', () => {
  it('starts collapsed when the brand is empty and opens on tap', async () => {
    const user = userEvent.setup()
    renderSheet()

    const toggle = screen.getByRole('button', { name: 'Brand (optional)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle.querySelector('[data-slot="collapse-chevron"]')).toHaveClass(
      'bg-transparent',
    )
    expect(screen.queryByLabelText('Brand (optional)')).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Brand (optional)')).toHaveValue('')
    expect(toggle.querySelector('[data-slot="collapse-chevron"]')).toHaveClass(
      'rotate-180',
    )
  })

  it('uses the Russian label as the collapsed disclosure', () => {
    useLocaleStore.getState().setLocale('ru')
    renderSheet()

    expect(
      screen.getByRole('button', { name: 'Бренд (необязательно)' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByLabelText('Бренд (необязательно)'),
    ).not.toBeInTheDocument()
  })

  it('shows an existing brand expanded', () => {
    renderSheet('Ермолино')

    expect(
      screen.getByRole('button', { name: 'Brand (optional)' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Brand (optional)')).toHaveValue('Ермолино')
  })

  it('shows Homemade unchecked beside a collapsed brand (#994)', async () => {
    const user = userEvent.setup()
    const onHomemadeChange = vi.fn()
    const onBrandChange = vi.fn()
    render(
      <MealItemEditorSheet
        {...sheetElement().props}
        onHomemadeChange={onHomemadeChange}
        onBrandChange={onBrandChange}
      />,
    )

    const homemade = screen.getByRole('checkbox', { name: 'Homemade' })
    expect(homemade).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Brand (optional)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await user.click(homemade)
    expect(onHomemadeChange).toHaveBeenCalledWith(true)
    expect(onBrandChange).not.toHaveBeenCalled()
  })

  it('uses the Russian homemade label and can start checked (#994)', () => {
    useLocaleStore.getState().setLocale('ru')
    render(
      <MealItemEditorSheet {...sheetElement('Ермолино').props} homemade />,
    )

    expect(screen.getByRole('checkbox', { name: 'Домашнее' })).toBeChecked()
    expect(screen.getByLabelText('Бренд (необязательно)')).toHaveValue('Ермолино')
  })

  it('keeps each macro whole and puts the previous total on its own line (#1004)', () => {
    useLocaleStore.getState().setLocale('ru')
    render(
      <MealItemEditorSheet
        {...sheetElement().props}
        todayTotalPreview="Итог за сегодня будет: 1 030 ккал · Б 40г · Ж 46г · У 114г (было 350 ккал · Б 26г · Ж 24г · У 6г)"
        todayRemainingPreview="Останется: 375 ккал (было 1 055 ккал)"
      />,
    )

    const carbs = screen.getByText(
      (_content, element) =>
        element?.tagName === 'SPAN' &&
        element.classList.contains('whitespace-nowrap') &&
        element.textContent === ' · У 114г',
    )
    const previous = screen.getByText(
      (_content, element) =>
        element?.tagName === 'SPAN' &&
        element.textContent === '(было 350 ккал',
    )
    expect(carbs.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'current',
    )
    expect(previous.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'previous',
    )
    expect(screen.getByText('Итого:').closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'current',
    )
  })

  it('opens when a brand arrives while the sheet is already open', () => {
    const view = renderSheet()
    expect(screen.queryByLabelText('Brand (optional)')).not.toBeInTheDocument()

    view.rerender(sheetElement('Perdue'))

    expect(screen.getByLabelText('Brand (optional)')).toHaveValue('Perdue')
  })
})
