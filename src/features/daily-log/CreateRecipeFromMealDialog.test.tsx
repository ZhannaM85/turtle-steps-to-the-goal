import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieItem } from '@/domain/dailyEntry'
import { CreateRecipeFromMealDialog } from './CreateRecipeFromMealDialog'

const weighed: CalorieItem[] = [
  { id: 'a', name: 'Bread', amountKcal: 94, amountG: 100 },
  { id: 'b', name: 'Butter', amountKcal: 98, amountG: 100 },
]

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
})
