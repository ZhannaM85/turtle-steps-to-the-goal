import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCatalogFoodImportStore, useLdlImpactStore } from '@/stores'
import { CatalogFoodImportSection } from './CatalogFoodImportSection'

const coleslaw = {
  nameRu: 'Салат Коул слоу',
  nameEn: 'Coleslaw',
  caloriesPer100g: 95,
  proteinPer100g: 1.4,
  fatPer100g: 7.5,
  carbsPer100g: 6.3,
  cholesterolImpact: 'beneficial',
  cholesterolReasonRu: 'Полезно для ЛПНП.',
  cholesterolReasonEn: 'Helpful for LDL.',
}

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  await db.dailyEntries.clear()
  useCatalogFoodImportStore.setState({
    imports: [],
    status: 'idle',
    error: null,
  })
  useLdlImpactStore.setState({ enabled: false })
  await db.dailyEntries.put({
    id: 'day-1',
    date: '2026-09-26',
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    calorieEntries: [
      {
        id: 'meal-1',
        label: 'breakfast',
        createdAt: '2026-09-26T00:00:00.000Z',
        items: [{ id: 'item-1', name: 'Овсянка', amountKcal: 200 }],
      },
    ],
  })
})

afterEach(async () => {
  await db.catalogFoodImports.clear()
  await db.dailyEntries.clear()
})

function paste(json: string) {
  fireEvent.change(screen.getByLabelText('Import catalog foods'), {
    target: { value: json },
  })
}

describe('CatalogFoodImportSection (#1015)', () => {
  it('imports a foods list while the LDL toggle stays off', async () => {
    const user = userEvent.setup()
    render(<CatalogFoodImportSection />)

    paste(JSON.stringify({ nutritionBasis: 'per 100 g', foods: [coleslaw] }))
    await user.click(screen.getByRole('button', { name: 'Import foods' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added 1, updated 0.',
    )
    expect(useLdlImpactStore.getState().enabled).toBe(false)
    const stored = await db.catalogFoodImports.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      nameRu: 'Салат Коул слоу',
      nameEn: 'Coleslaw',
      kcal100: 95,
      cholesterolImpact: 'beneficial',
      cholesterolReason: 'Полезно для ЛПНП.',
      cholesterolReasonEn: 'Helpful for LDL.',
    })
    const day = await db.dailyEntries.get('day-1')
    expect(day?.calorieEntries?.[0]?.items[0]).toMatchObject({
      name: 'Овсянка',
      amountKcal: 200,
    })
  })

  it('updates the same Russian name instead of adding a second row', async () => {
    const user = userEvent.setup()
    render(<CatalogFoodImportSection />)

    paste(JSON.stringify(coleslaw))
    await user.click(screen.getByRole('button', { name: 'Import foods' }))
    expect(await screen.findByText('Added 1, updated 0.')).toBeInTheDocument()

    paste(JSON.stringify({ ...coleslaw, caloriesPer100g: 110 }))
    await user.click(screen.getByRole('button', { name: 'Import foods' }))

    expect(await screen.findByText('Added 0, updated 1.')).toBeInTheDocument()
    expect(await db.catalogFoodImports.count()).toBe(1)
    expect((await db.catalogFoodImports.toArray())[0]?.kcal100).toBe(110)
  })

  it('shows which foods failed and still saves the valid ones', async () => {
    const user = userEvent.setup()
    render(<CatalogFoodImportSection />)

    paste(JSON.stringify({ foods: [coleslaw, { nameRu: 'Без БЖУ' }] }))
    await user.click(screen.getByRole('button', { name: 'Import foods' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Added 1, updated 0.')
    expect(status).toHaveTextContent(
      'Без БЖУ: Calories and macros per 100 g are required.',
    )
  })

  it('shows an error for invalid JSON and does not write a row', async () => {
    const user = userEvent.setup()
    render(<CatalogFoodImportSection />)

    paste('{')
    await user.click(screen.getByRole('button', { name: 'Import foods' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'That text is not valid JSON.',
    )
    expect(await db.catalogFoodImports.count()).toBe(0)
  })
})
