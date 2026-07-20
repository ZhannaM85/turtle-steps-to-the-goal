import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieItem } from '@/domain/dailyEntry'
import { RepeatMealDialog } from './RepeatMealDialog'

function items(overrides: Partial<CalorieItem>[] = []): CalorieItem[] {
  const defaults: CalorieItem[] = [
    { id: 'i1', name: 'Eggs', amountKcal: 150, proteinG: 12 },
    { id: 'i2', name: 'Toast', amountKcal: 120 },
  ]
  return overrides.length > 0 ? (overrides as CalorieItem[]) : defaults
}

describe('RepeatMealDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <RepeatMealDialog
        open={false}
        onOpenChange={vi.fn()}
        mealLabel="Breakfast"
        items={items()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows every dish, all checked by default, with its kcal preview', () => {
    render(
      <RepeatMealDialog
        open
        onOpenChange={vi.fn()}
        mealLabel="Breakfast"
        items={items()}
        onConfirm={vi.fn()}
      />,
    )

    const eggsRow = screen.getByRole('checkbox', { name: /Eggs/ })
    const toastRow = screen.getByRole('checkbox', { name: /Toast/ })
    expect(eggsRow).toHaveAttribute('aria-checked', 'true')
    expect(toastRow).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/150 kcal/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add selected (2)' }),
    ).toBeInTheDocument()
  })

  it('unchecking a dish excludes it from the confirmed selection', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <RepeatMealDialog
        open
        onOpenChange={vi.fn()}
        mealLabel="Breakfast"
        items={items()}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /Toast/ }))
    expect(
      screen.getByRole('button', { name: 'Add selected' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add selected' }))

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'i1', name: 'Eggs' }),
    ])
  })

  it('disables the confirm button once every dish is unchecked', async () => {
    const user = userEvent.setup()
    render(
      <RepeatMealDialog
        open
        onOpenChange={vi.fn()}
        mealLabel="Breakfast"
        items={items([{ id: 'i1', name: 'Eggs', amountKcal: 150 }])}
        onConfirm={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /Eggs/ }))

    expect(
      screen.getByRole('button', { name: /Add selected/ }),
    ).toBeDisabled()
  })
})
