import 'fake-indexeddb/auto'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { buildShareFoodBatchUrl } from '@/features/food-share/buildShareFoodUrl'
import { decodeSharedFoodLink } from '@/features/food-share/sharedFoodBatchPayload'
import { useFoodShareUiStore } from '@/features/food-share'
import { SharedFoodImportHost } from '@/features/food-share/SharedFoodImportHost'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores/mealItemStore'
import { MealList } from './MealList'

vi.mock('@/features/food-share/generateQrDataUrl', () => ({
  generateQrDataUrl: vi.fn(async () => 'data:image/png;base64,qq'),
}))

const oats = {
  v: 1 as const,
  name: 'Хлопья овсяные',
  amountKcal: 204,
  amountG: 60,
  proteinG: 7,
  fatG: 4,
  carbsG: 36,
}

const milk = {
  v: 1 as const,
  name: 'Milk (no sugar or lactose)',
  amountKcal: 45,
  amountG: 100,
  proteinG: 3,
  fatG: 2,
  carbsG: 5,
}

function ControlledMealList({
  initial = [],
}: {
  initial?: CalorieEntry[]
}) {
  const [entries, setEntries] = useState(initial)
  return (
    <MealList calorieEntries={entries} date="2026-09-27" onChange={setEntries} />
  )
}

beforeEach(async () => {
  await db.mealItems.clear()
  await db.dailyEntries.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useFoodShareUiStore.setState({
    entryOpen: false,
    importOpen: false,
    payload: null,
    batchImportOpen: false,
    batchItems: null,
    onImported: null,
  })
})

afterEach(async () => {
  await db.mealItems.clear()
  await db.dailyEntries.clear()
})

describe('multi-food share into an open meal (#1028)', () => {
  it('encodes both foods, writes both library rows, and appends both dishes', async () => {
    const user = userEvent.setup()
    const shareUrl = buildShareFoodBatchUrl([oats, milk], {
      origin: 'https://example.test',
      baseUrl: '/',
    })
    const decoded = decodeSharedFoodLink(
      new URL(shareUrl).searchParams.get('shareFood') ?? '',
    )
    expect(decoded).toEqual({ kind: 'many', items: [oats, milk] })

    render(
      <MemoryRouter>
        <SharedFoodImportHost />
        <ControlledMealList />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '+ Add a meal' }))
    await user.click(screen.getByRole('button', { name: 'Shared food' }))
    await user.type(screen.getByPlaceholderText('Paste link here'), shareUrl)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      screen.getByRole('heading', { name: 'Review shared foods' }),
    ).toBeInTheDocument()
    expect(screen.getByText(oats.name)).toBeInTheDocument()
    expect(screen.getByText(milk.name)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add all foods' }))

    await waitFor(() => {
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent(oats.name)
      expect(mealSoFar).toHaveTextContent(milk.name)
    })

    await waitFor(() => {
      const names = useMealItemStore.getState().items.map((item) => item.name)
      expect(names).toEqual(expect.arrayContaining([oats.name, milk.name]))
    })
    expect(useMealItemStore.getState().items).toHaveLength(2)
  })

  it('appends both foods onto a meal that is already open for edit', async () => {
    const user = userEvent.setup()
    const shareUrl = buildShareFoodBatchUrl([oats, milk], {
      origin: 'https://example.test',
      baseUrl: '/',
    })
    const existing: CalorieEntry = {
      id: 'meal-1',
      label: 'Breakfast',
      items: [{ id: 'toast', name: 'Toast', amountKcal: 80 }],
      createdAt: '2026-09-27T08:00:00.000Z',
    }

    render(
      <MemoryRouter>
        <SharedFoodImportHost />
        <ControlledMealList initial={[existing]} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Shared food' }))
    await user.type(screen.getByPlaceholderText('Paste link here'), shareUrl)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Add all foods' }))

    await waitFor(() => {
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent('Toast')
      expect(mealSoFar).toHaveTextContent(oats.name)
      expect(mealSoFar).toHaveTextContent(milk.name)
    })
  })
})
