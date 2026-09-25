import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieItem } from '@/domain/dailyEntry'
import { CreateRecipeFromMealDialog } from './CreateRecipeFromMealDialog'

const weighed: CalorieItem[] = [
  { id: 'a', name: 'Bread', amountKcal: 94, amountG: 100 },
  { id: 'b', name: 'Butter', amountKcal: 98, amountG: 100 },
]

function statusWithText(text: string) {
  const status = screen.getByText(text).closest('[role="status"]')
  if (!(status instanceof HTMLElement)) {
    throw new Error(`missing status: ${text}`)
  }
  return status
}

describe('CreateRecipeFromMealDialog (#983)', () => {
  it('shows per 100 g calories when the selection has no macros', () => {
    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={() => {}}
        items={weighed}
        recipes={[]}
        onSave={() => {}}
      />,
    )

    expect(screen.getByText(/Per 100 g: 96 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/192 kcal/)).toBeInTheDocument()
    expect(
      screen.queryByText('These foods are already saved as recipes'),
    ).not.toBeInTheDocument()
  })

  it('warns which selected foods are already recipes and copies that name (#986)', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    const onSave = vi.fn()

    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={() => {}}
        items={[
          { id: 'a', name: 'Батон семейный', amountKcal: 94, amountG: 36 },
          { id: 'b', name: 'Масло', amountKcal: 98, amountG: 13 },
          { id: 'c', name: 'Форель', amountKcal: 74, amountG: 75 },
        ]}
        recipes={[
          { id: 'r-bread', name: 'Батон семейный' },
          { id: 'r-trout', name: 'Форель' },
        ]}
        onSave={onSave}
      />,
    )

    const warning = screen.getByRole('status')
    expect(warning).toHaveTextContent(
      'These foods are already saved as recipes',
    )
    expect(within(warning).getByText('Батон семейный')).toBeInTheDocument()
    expect(within(warning).getByText('Форель')).toBeInTheDocument()
    expect(within(warning).queryByText('Масло')).not.toBeInTheDocument()

    const save = screen.getByRole('button', { name: 'Save recipe' })
    expect(save).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Copy name “Форель”' }),
    )
    const name = screen.getByLabelText('Recipe name')
    expect(name).toHaveValue('Форель')
    expect(writeText).toHaveBeenCalledWith('Форель')
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Форель' }),
    )

    await user.clear(name)
    await user.type(name, 'Бутерброд')
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Бутерброд' }),
    )
  })

  it('warns when the same foods are already a recipe and copies that name (#988)', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    const onSave = vi.fn()
    const foods: CalorieItem[] = [
      { id: 'a', name: 'Батон семейный', amountKcal: 94, amountG: 36 },
      { id: 'b', name: 'Масло', amountKcal: 98, amountG: 13 },
      { id: 'c', name: 'Форель', amountKcal: 74, amountG: 75 },
    ]

    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={() => {}}
        items={foods}
        recipes={[
          {
            id: 'sandwich',
            name: 'Бутерброд с форелью',
            ingredients: [
              { name: 'Форель' },
              { name: 'Батон семейный' },
              { name: 'Масло' },
            ],
          },
        ]}
        onSave={onSave}
      />,
    )

    const warning = statusWithText(
      'This combination of foods is already a recipe',
    )
    expect(warning).toHaveTextContent('Бутерброд с форелью')
    expect(
      screen.queryByText('These foods are already saved as recipes'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('A recipe with this name already exists'),
    ).not.toBeInTheDocument()

    const save = screen.getByRole('button', { name: 'Save recipe' })
    expect(save).toBeDisabled()
    await user.click(
      within(warning).getByRole('button', {
        name: 'Copy name “Бутерброд с форелью”',
      }),
    )
    expect(screen.getByLabelText('Recipe name')).toHaveValue(
      'Бутерброд с форелью',
    )
    expect(writeText).toHaveBeenCalledWith('Бутерброд с форелью')
    expect(
      screen.getByText('A recipe with this name already exists'),
    ).toBeInTheDocument()
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Бутерброд с форелью' }),
    )
  })

  it('shows name, combination, and typed-title warnings together and still saves (#988)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const foods: CalorieItem[] = [
      { id: 'a', name: 'Батон семейный', amountKcal: 94, amountG: 36 },
      { id: 'b', name: 'Масло', amountKcal: 98, amountG: 13 },
      { id: 'c', name: 'Форель', amountKcal: 74, amountG: 75 },
    ]

    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={() => {}}
        items={foods}
        recipes={[
          { id: 'r-bread', name: 'Батон семейный' },
          {
            id: 'sandwich',
            name: 'Бутерброд с форелью',
            ingredients: [
              { name: 'Масло' },
              { name: 'Форель' },
              { name: 'Батон семейный' },
            ],
          },
        ]}
        onSave={onSave}
      />,
    )

    expect(
      statusWithText('These foods are already saved as recipes'),
    ).toHaveTextContent('Батон семейный')
    expect(
      statusWithText('This combination of foods is already a recipe'),
    ).toHaveTextContent('Бутерброд с форелью')

    const name = screen.getByLabelText('Recipe name')
    await user.type(name, 'бутерброд с форелью')
    const titleWarning = statusWithText(
      'A recipe with this name already exists',
    )
    expect(titleWarning).toHaveTextContent('Бутерброд с форелью')
    expect(screen.getAllByRole('status')).toHaveLength(3)

    const save = screen.getByRole('button', { name: 'Save recipe' })
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'бутерброд с форелью' }),
    )
  })

  it('offers to add the saved recipe and leaves the meal alone when declined (#987)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    const onAddToMeal = vi.fn()

    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={onOpenChange}
        items={weighed}
        recipes={[]}
        onSave={onSave}
        onAddToMeal={onAddToMeal}
      />,
    )

    await user.type(screen.getByLabelText('Recipe name'), 'Sandwich')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sandwich' }),
    )
    expect(onAddToMeal).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', { name: 'You created a recipe' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Add “Sandwich” to this meal and remove the foods you used?',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: "Don't add" }))
    expect(onAddToMeal).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('adds the saved recipe only after confirm (#987)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    const onAddToMeal = vi.fn()

    render(
      <CreateRecipeFromMealDialog
        open
        onOpenChange={onOpenChange}
        items={weighed}
        recipes={[]}
        onSave={onSave}
        onAddToMeal={onAddToMeal}
      />,
    )

    await user.type(screen.getByLabelText('Recipe name'), 'Sandwich')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))
    await user.click(
      await screen.findByRole('button', { name: 'Add recipe' }),
    )

    expect(onAddToMeal).toHaveBeenCalledTimes(1)
    expect(onAddToMeal).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sandwich' }),
      weighed,
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
