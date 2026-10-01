import 'fake-indexeddb/auto'
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCatalogFoodImportStore, useMealItemStore } from '@/stores'
import { AddMealDialogBrowse } from './AddMealDialogBrowse'
import { useAddMealCatalog } from './useAddMealCatalog'

const pasted = {
  nameRu: 'Тестовый JSON',
  nameEn: 'Test JSON food',
  caloriesPer100g: 40,
  proteinPer100g: 1,
  fatPer100g: 1,
  carbsPer100g: 5,
  cholesterolImpact: 'neutral',
}

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  useCatalogFoodImportStore.setState({
    imports: [],
    status: 'idle',
    error: null,
  })
  useMealItemStore.setState({
    items: [
      {
        id: 'older-dish',
        name: 'Старое блюдо',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
        lastAmountKcal: 100,
      },
    ],
    status: 'ready',
  })
})

function renderBrowse() {
  render(
    <AddMealDialogBrowse
      mealLabel="Breakfast"
      search=""
      query=""
      matches={[]}
      recentItems={[]}
      allMealItemsCount={0}
      recentCount={3}
      showAllRecent={false}
      onToggleShowAllRecent={vi.fn()}
      textFor={() => ''}
      isFavorite={() => false}
      onToggleFavorite={vi.fn()}
      onPick={vi.fn()}
      onOpenManualAdd={vi.fn()}
      onOpenBarcode={vi.fn()}
      onOpenRecipe={vi.fn()}
      onImportSharedFood={vi.fn()}
      onlineHits={[]}
      onlineSearchStatus="idle"
      onlineRemoteStatus={null}
      onRunOnlineSearch={vi.fn()}
      onPickOnlineHit={vi.fn()}
      onChangeSearch={vi.fn()}
      onClearSearch={vi.fn()}
      homemadeOnly={false}
      onToggleHomemadeOnly={vi.fn()}
      mealNoteField={null}
      showEmptyMealNote={false}
    />,
  )
}

describe('Add meal catalog JSON paste (#1054)', () => {
  it('stamps import time so Recent ranks the paste without a meal log', async () => {
    const user = userEvent.setup()
    renderBrowse()
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Import catalog foods' }),
      { target: { value: JSON.stringify(pasted) } },
    )
    await user.click(screen.getByRole('button', { name: 'Import foods' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 1, updated 0.',
    )
    const stored = await db.catalogFoodImports.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.nameRu).toBe('Тестовый JSON')
    expect(stored[0]?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Date.parse(stored[0]!.updatedAt)).toBeGreaterThan(
      Date.parse('2026-09-01T12:00:00.000Z'),
    )

    const { result } = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: '',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )
    expect(result.current.recentItems[0]).toMatchObject({
      source: 'food',
      food: { ru: 'Тестовый JSON' },
    })
  })
})
