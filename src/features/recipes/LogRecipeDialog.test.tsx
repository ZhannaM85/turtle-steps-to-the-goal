import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Recipe } from '@/domain/recipe'
import { LogRecipeDialog } from './LogRecipeDialog'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'recipe-1',
    name: 'Chili',
    servings: 4,
    ingredients: [
      { id: 'ing-1', name: 'Ground beef', amountKcal: 800, proteinG: 60 },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('LogRecipeDialog', () => {
  it('shows a message when there are no recipes yet', () => {
    render(
      <LogRecipeDialog open onOpenChange={vi.fn()} recipes={[]} onLog={vi.fn()} />,
    )

    expect(
      screen.getByText("You haven't added any recipes yet — manage them from Settings."),
    ).toBeInTheDocument()
  })

  it('disables Log until a recipe is picked', () => {
    render(
      <LogRecipeDialog
        open
        onOpenChange={vi.fn()}
        recipes={[makeRecipe()]}
        onLog={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Log' })).toBeDisabled()
  })

  it('logs the recipe scaled by servings eaten', async () => {
    const user = userEvent.setup()
    const onLog = vi.fn()
    render(
      <LogRecipeDialog
        open
        onOpenChange={vi.fn()}
        recipes={[makeRecipe()]}
        onLog={onLog}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Chili' }))
    const servingsInput = screen.getByLabelText('Servings eaten')
    await user.clear(servingsInput)
    await user.type(servingsInput, '2')
    await user.click(screen.getByRole('button', { name: 'Log' }))

    // 800kcal/60g protein over 4 servings = 200kcal/15g per serving,
    // scaled by 2 servings eaten = 400kcal/30g.
    expect(onLog).toHaveBeenCalledWith([
      expect.objectContaining({
        note: 'Chili',
        amountKcal: 400,
        proteinG: 30,
        fatG: 0,
        carbsG: 0,
      }),
    ])
  })

  it('shows a live preview of the scaled totals', async () => {
    const user = userEvent.setup()
    render(
      <LogRecipeDialog
        open
        onOpenChange={vi.fn()}
        recipes={[makeRecipe()]}
        onLog={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Chili' }))

    expect(screen.getByText(/200 kcal/)).toBeInTheDocument()
  })
})
