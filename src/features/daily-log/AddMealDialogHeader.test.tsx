import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { Dialog } from '@/shared/ui/dialog'
import { AddMealDialogHeader } from './AddMealDialogHeader'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderHeader() {
  render(
    <Dialog open>
      <AddMealDialogHeader
        mealLabel="Breakfast"
        onMealLabelChange={vi.fn()}
        timeEaten="08:00"
        onTimeEatenChange={vi.fn()}
        mealLabelSuggestions={['Breakfast', 'Lunch', 'Dinner', 'Snack']}
        onSaveMealNameAsTemplate={vi.fn()}
      />
    </Dialog>,
  )
}

describe('AddMealDialogHeader', () => {
  it('does not show a repeat or info toolbar (#1078)', () => {
    renderHeader()

    expect(screen.queryByTestId('add-meal-repeat-toolbar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Repeat yesterday/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "About repeating yesterday's meal" }),
    ).not.toBeInTheDocument()
  })

  it('shows the add-meal title and close on one row (#1076)', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderHeader()

    const titleRow = screen.getByTestId('add-meal-title-row')
    const title = screen.getByRole('heading', { name: 'Добавить приём пищи' })
    const close = screen.getByRole('button', { name: 'Закрыть' })
    expect(titleRow).toContainElement(title)
    expect(titleRow).toContainElement(close)
    expect(titleRow).toHaveClass('items-center', 'justify-between')
    const controls = screen.getByTestId('add-meal-name-row')
    const name = screen.getByRole('button', { name: 'Название приёма пищи' })
    const time = screen.getByLabelText('Время')
    expect(controls).not.toContainElement(close)
    expect(controls).toHaveClass(
      'grid',
      'grid-cols-2',
      'items-end',
      'gap-1.5',
      'pr-4',
    )
    expect(controls.children).toHaveLength(2)
    expect(controls.children[0]).toContainElement(name)
    expect(controls.children[1]).toContainElement(time)
    expect(screen.queryByTestId('add-meal-time-row')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Про повтор вчерашнего приёма пищи' }),
    ).not.toBeInTheDocument()
  })
})
