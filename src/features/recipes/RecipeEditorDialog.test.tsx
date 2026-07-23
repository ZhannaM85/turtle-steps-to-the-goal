import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import { RecipeEditorDialog } from './RecipeEditorDialog'

describe('RecipeEditorDialog', () => {
  it('starts blank when adding a new recipe', () => {
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={[]}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Add recipe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Recipe name')).toHaveValue('')
    expect(
      screen.getByText('No ingredients yet — add at least one below.'),
    ).toBeInTheDocument()
  })

  it('prefills fields when editing an existing recipe', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      name: 'Chili',
      servings: 4,
      ingredients: [
        { id: 'ing-1', name: 'Ground beef', amountKcal: 800, proteinG: 60 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={recipe}
        mealItems={[]}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Edit recipe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Recipe name')).toHaveValue('Chili')
    expect(screen.getByLabelText('Servings')).toHaveValue('4')
    expect(screen.getByText(/Ground beef/)).toBeInTheDocument()
  })

  it('adds a typed ingredient to the staged list', async () => {
    const user = userEvent.setup()
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={[]}
        onSave={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Ingredient name'), 'Ground beef')
    await user.type(screen.getByLabelText('kcal/100g'), '250')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.getByText(/Ground beef/)).toBeInTheDocument()
    expect(
      screen.queryByText('No ingredients yet — add at least one below.'),
    ).not.toBeInTheDocument()
  })

  it('removes an ingredient from the staged list', async () => {
    const user = userEvent.setup()
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={[]}
        onSave={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Ingredient name'), 'Ground beef')
    await user.type(screen.getByLabelText('kcal/100g'), '250')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    await user.click(screen.getByRole('button', { name: 'Remove Ground beef' }))

    expect(
      screen.getByText('No ingredients yet — add at least one below.'),
    ).toBeInTheDocument()
  })

  it('disables Save until a name and at least one ingredient exist', async () => {
    const user = userEvent.setup()
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={[]}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.type(screen.getByLabelText('Recipe name'), 'Chili')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.type(screen.getByLabelText('Ingredient name'), 'Ground beef')
    await user.type(screen.getByLabelText('kcal/100g'), '250')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('saves a recipe with the staged name/servings/ingredients', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={[]}
        onSave={onSave}
      />,
    )

    await user.type(screen.getByLabelText('Recipe name'), 'Chili')
    const servingsInput = screen.getByLabelText('Servings')
    await user.clear(servingsInput)
    await user.type(servingsInput, '4')
    await user.type(screen.getByLabelText('Ingredient name'), 'Ground beef')
    await user.type(screen.getByLabelText('kcal/100g'), '250')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0] as Recipe
    expect(saved.name).toBe('Chili')
    expect(saved.servings).toBe(4)
    expect(saved.ingredients).toEqual([
      expect.objectContaining({ name: 'Ground beef', amountKcal: 250 }),
    ])
  })

  it('prefills an ingredient\'s rate when a matching meal item is selected', async () => {
    const user = userEvent.setup()
    const mealItems: MealItem[] = [
      {
        id: 'item-1',
        name: 'Ground beef',
        lastAmountKcal: 500,
        lastProteinG: 40,
        lastAmountG: 200,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <RecipeEditorDialog
        open
        onOpenChange={vi.fn()}
        recipe={null}
        mealItems={mealItems}
        onSave={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Ingredient name'), 'Ground beef')
    await user.click(screen.getByRole('button', { name: 'Ground beef' }))

    // 500kcal/40g protein over 200g -> 250kcal/20g protein per 100g.
    expect(screen.getByLabelText('kcal/100g')).toHaveValue('250')
    expect(screen.getByLabelText('Protein')).toHaveValue('20')
  })
})
