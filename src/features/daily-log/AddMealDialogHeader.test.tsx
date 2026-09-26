import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { Dialog } from '@/shared/ui/dialog'
import { AddMealDialogHeader } from './AddMealDialogHeader'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderHeader(
  overrides: Partial<Parameters<typeof AddMealDialogHeader>[0]> = {},
) {
  const onRepeatYesterday = vi.fn()
  render(
    <Dialog open>
      <AddMealDialogHeader
        mealLabel="Breakfast"
        onMealLabelChange={vi.fn()}
        timeEaten="08:00"
        onTimeEatenChange={vi.fn()}
        mealLabelSuggestions={['Breakfast', 'Lunch', 'Dinner', 'Snack']}
        onSaveMealNameAsTemplate={vi.fn()}
        repeatYesterdayLabel="Repeat yesterday's breakfast?"
        onRepeatYesterday={onRepeatYesterday}
        {...overrides}
      />
    </Dialog>,
  )
  return { onRepeatYesterday }
}

describe('AddMealDialogHeader repeat info (#1003)', () => {
  it('explains the repeat arrow from an info icon on the name row', async () => {
    const user = userEvent.setup()
    const { onRepeatYesterday } = renderHeader()

    const row = screen.getByTestId('add-meal-name-row')
    const repeat = within(row).getByRole('button', {
      name: "Repeat yesterday's breakfast?",
    })
    const info = within(row).getByRole('button', {
      name: "About repeating yesterday's meal",
    })

    expect(repeat).not.toHaveAttribute('title')
    expect(repeat).not.toHaveClass('w-full')
    expect(repeat.compareDocumentPosition(info)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(repeat.closest('[data-slot="control-with-info"]')).toContainElement(
      info,
    )

    await user.click(repeat)
    expect(onRepeatYesterday).toHaveBeenCalledOnce()

    await user.click(info)
    expect(
      await screen.findByText(
        "Repeats yesterday's meal of this type. You confirm the dishes before they are added.",
      ),
    ).toBeInTheDocument()
  })

  it('hides the info icon when there is no yesterday meal to repeat', () => {
    renderHeader({
      repeatYesterdayLabel: undefined,
      onRepeatYesterday: undefined,
    })

    expect(
      screen.queryByRole('button', { name: "About repeating yesterday's meal" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Repeat yesterday/ }),
    ).not.toBeInTheDocument()
  })

  it('explains the arrow in plain Russian', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const user = userEvent.setup()
    renderHeader()

    await user.click(
      screen.getByRole('button', { name: 'Про повтор вчерашнего приёма пищи' }),
    )
    expect(
      await screen.findByText(
        'Повторяет вчерашний приём пищи этого типа. Блюда добавляются только после подтверждения.',
      ),
    ).toBeInTheDocument()
  })
})
