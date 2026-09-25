import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Recipe } from '@/domain/recipe'
import { useLocale, useTranslation } from '@/i18n'
import type { PickableItem } from './addMealDialogHelpers'
import { AddMealPickableItemList } from './AddMealPickableItemList'

const recipe: PickableItem = {
  source: 'recipe',
  recipe: {
    id: 'recipe-1',
    name: 'Бутерброд с форелью',
    ingredients: [
      {
        id: 'ing',
        name: 'Форель',
        amountKcal: 266,
        proteinG: 18,
        fatG: 13,
        carbsG: 19,
      },
    ],
    servings: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  } satisfies Recipe,
}

function List({
  onDeleteItem,
  onPick = vi.fn(),
}: {
  onDeleteItem: (item: PickableItem) => Promise<'deleted' | 'in-use' | 'none'>
  onPick?: (item: PickableItem) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  return (
    <AddMealPickableItemList
      items={[recipe]}
      textFor={() => 'Бутерброд с форелью'}
      isFavorite={() => false}
      onToggleFavorite={vi.fn()}
      onPick={onPick}
      onDeleteItem={onDeleteItem}
      deleteMode={() => 'duplicate'}
      t={t}
      locale={locale}
    />
  )
}

describe('meal search long-press delete (#995)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('confirms before deleting the extra copy', async () => {
    const user = userEvent.setup()
    const onDeleteItem = vi.fn(async () => 'deleted' as const)
    const onPick = vi.fn()
    render(<List onDeleteItem={onDeleteItem} onPick={onPick} />)

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /Бутерброд с форелью/ }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Delete the extra copy of “Бутерброд с форелью”?',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('The row in this list stays.')).toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeleteItem).toHaveBeenCalledWith(recipe)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an in-use message instead of deleting the last history row', async () => {
    const user = userEvent.setup()
    const onDeleteItem = vi.fn(async () => 'in-use' as const)
    render(<List onDeleteItem={onDeleteItem} />)

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /Бутерброд с форелью/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      screen.getByRole('heading', {
        name: 'This is in your meal history, so it can’t be removed.',
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the same confirm after a long press without picking the row', () => {
    vi.useFakeTimers()
    const onDeleteItem = vi.fn(async () => 'deleted' as const)
    const onPick = vi.fn()
    render(<List onDeleteItem={onDeleteItem} onPick={onPick} />)

    const row = screen.getByRole('button', { name: /Бутерброд с форелью/ })
    fireEvent.pointerDown(row, { button: 0, clientX: 10, clientY: 10 })
    act(() => {
      vi.advanceTimersByTime(450)
    })
    fireEvent.pointerUp(row)
    fireEvent.click(row)

    expect(
      screen.getByRole('heading', {
        name: 'Delete the extra copy of “Бутерброд с форелью”?',
      }),
    ).toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })
})
