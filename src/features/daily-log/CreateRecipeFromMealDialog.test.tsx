import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
        onSave={() => {}}
      />,
    )

    expect(screen.getByText(/Per 100 g: 96 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/192 kcal/)).toBeInTheDocument()
  })
})
