import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore } from '@/stores'
import { FoodListSettingsScreen } from './FoodListSettingsScreen'

// The curated list has 300+ items (#78) — every test here renders them
// all, which is fast in isolation but was flaky under full-suite parallel
// load at the default 5s (same fix as FoodPickerDialog.test.tsx, #78).
vi.setConfig({ testTimeout: 15000 })

beforeEach(async () => {
  await db.foodOverrides.clear()
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.foodOverrides.clear()
})

function renderScreen() {
  return render(<FoodListSettingsScreen />, { wrapper: MemoryRouter })
}

describe('FoodListSettingsScreen (#90)', () => {
  it('filters the list as the user types', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(screen.getByText('Salmon')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search foods'), 'chicken breast')

    expect(screen.getByText('Chicken breast')).toBeInTheDocument()
    expect(screen.queryByText('Salmon')).not.toBeInTheDocument()
  })

  it('hides a food, marking it visually and flipping the button to Show', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')

    await user.click(screen.getByRole('button', { name: 'Hide Chicken breast' }))

    // The store action is async (IndexedDB write + reload) — the button's
    // own click resolves before that finishes, so assert via findBy* (which
    // retries) rather than getBy* (which checks once, immediately).
    expect(
      await screen.findByRole('button', { name: 'Show Chicken breast' }),
    ).toBeInTheDocument()
    expect(screen.getByText('(Hidden)')).toBeInTheDocument()
  })

  it('showing an already-hidden food clears the hidden badge', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')

    await user.click(screen.getByRole('button', { name: 'Hide Chicken breast' }))
    await user.click(
      await screen.findByRole('button', { name: 'Show Chicken breast' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Hide Chicken breast' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('(Hidden)')).not.toBeInTheDocument()
  })

  it('edits and saves corrected macros, showing a Restore default option', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')

    await user.click(screen.getByRole('button', { name: 'Edit Chicken breast' }))
    const kcalInput = screen.getByLabelText('kcal — Chicken breast')
    await user.clear(kcalInput)
    await user.type(kcalInput, '200')
    await user.click(screen.getByRole('button', { name: 'Save Chicken breast' }))

    expect(
      await screen.findByText('200 kcal per 100g · P 31g · F 4g · C 0g'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Restore Chicken breast to default' }),
    ).toBeInTheDocument()
  })

  it('restoring default reverts to the shipped values', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')

    await user.click(screen.getByRole('button', { name: 'Edit Chicken breast' }))
    const kcalInput = screen.getByLabelText('kcal — Chicken breast')
    await user.clear(kcalInput)
    await user.type(kcalInput, '200')
    await user.click(screen.getByRole('button', { name: 'Save Chicken breast' }))

    const restoreButton = await screen.findByRole('button', {
      name: 'Restore Chicken breast to default',
    })
    await user.click(restoreButton)

    expect(
      await screen.findByText('165 kcal per 100g · P 31g · F 4g · C 0g'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Restore Chicken breast to default' }),
    ).not.toBeInTheDocument()
  })
})
