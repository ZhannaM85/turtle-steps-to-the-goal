import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieItem } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { useLocale, useLocaleStore, useTranslation } from '@/i18n'
import { useLdlImpactStore } from '@/stores'
import type { PickableItem } from './addMealDialogHelpers'
import { AddMealDialogComposition } from './AddMealDialogComposition'
import { AddMealPickableItemList } from './AddMealPickableItemList'

const cereal: PickableItem = {
  source: 'mealItem',
  mealItem: {
    id: 'cereal',
    name: 'Хлопья овсяные',
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z',
    lastAmountKcal: 204,
    lastProteinG: 7,
    lastFatG: 4,
    lastCarbsG: 36,
    cholesterolImpact: 'beneficial',
    cholesterolReason: 'Клетчатка овса',
  } satisfies MealItem,
}

const oats: PickableItem = {
  source: 'food',
  food: {
    id: 'oats',
    en: 'Овсянка',
    ru: 'Овсянка',
    kcal100: 68,
    protein100: 2.4,
    fat100: 1.4,
    carbs100: 12,
  },
}

const milk: CalorieItem = {
  id: 'milk',
  name: 'Milk (no sugar or lactose)',
  amountKcal: 45,
  amountG: 100,
  proteinG: 3,
  fatG: 2,
  carbsG: 5,
  cholesterolImpact: 'neutral',
  cholesterolReason: 'Без насыщенного жира',
}

function Surfaces({
  onPick = vi.fn(),
  onStartEditItem = vi.fn(),
}: {
  onPick?: (item: PickableItem) => void
  onStartEditItem?: (item: CalorieItem) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  return (
    <>
      <AddMealPickableItemList
        items={[cereal, oats]}
        textFor={(item) => {
          if (item.source === 'mealItem') return item.mealItem.name
          if (item.source === 'food') return item.food[locale]
          return item.recipe.name
        }}
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={onPick}
        t={t}
        locale={locale}
      />
      <AddMealDialogComposition
        items={[milk]}
        mealLabel="Breakfast"
        reaction={undefined}
        onReactionChange={vi.fn()}
        mealNoteField={null}
        showDoneWhenEmpty={false}
        todayTotalPreview={null}
        todayRemainingPreview={null}
        newlySatisfiedFactIds={[]}
        onStartEditItem={onStartEditItem}
        onShareItem={vi.fn()}
        onRequestRemoveItem={vi.fn()}
        isConfirmingMealDelete={false}
        onConfirmingMealDeleteChange={vi.fn()}
      />
    </>
  )
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useLdlImpactStore.setState({ enabled: false })
})

afterEach(() => {
  useLdlImpactStore.setState({ enabled: false })
})

describe('Add meal LDL badges (#1030)', () => {
  it('hides search and composition labels until Settings turns LDL on', () => {
    const { rerender } = render(<Surfaces />)

    expect(screen.queryByTestId('cholesterol-impact')).not.toBeInTheDocument()
    expect(screen.getByText('Хлопья овсяные')).toBeInTheDocument()
    expect(screen.getByText('Овсянка')).toBeInTheDocument()
    expect(screen.getByText('Milk (no sugar or lactose)')).toBeInTheDocument()

    useLdlImpactStore.setState({ enabled: true })
    rerender(<Surfaces />)

    const badges = screen.getAllByTestId('cholesterol-impact')
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveAttribute('data-cholesterol-impact', 'beneficial')
    expect(badges[1]).toHaveAttribute('data-cholesterol-impact', 'beneficial')
    expect(badges[2]).toHaveAttribute('data-cholesterol-impact', 'neutral')

    useLdlImpactStore.setState({ enabled: false })
    rerender(<Surfaces />)
    expect(screen.queryByTestId('cholesterol-impact')).not.toBeInTheDocument()
  })

  it('opens the same reason tip without adding or editing the food', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    const onStartEditItem = vi.fn()
    useLdlImpactStore.setState({ enabled: true })
    render(<Surfaces onPick={onPick} onStartEditItem={onStartEditItem} />)

    const helps = screen.getAllByRole('button', { name: 'LDL impact: Helps' })
    await user.click(helps[0])
    expect(screen.getByTestId('cholesterol-impact-reason')).toHaveTextContent(
      'Клетчатка овса',
    )

    await user.click(
      screen.getByRole('button', { name: 'LDL impact: Neutral' }),
    )
    expect(screen.getAllByTestId('cholesterol-impact-reason')[1]).toHaveTextContent(
      'Без насыщенного жира',
    )
    expect(onPick).not.toHaveBeenCalled()
    expect(onStartEditItem).not.toHaveBeenCalled()
  })
})
