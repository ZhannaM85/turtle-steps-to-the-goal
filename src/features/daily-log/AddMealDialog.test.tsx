import 'fake-indexeddb/auto'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieItem, Emotion } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore, useMealItemStore, useRecipeStore } from '@/stores'
import { AddMealDialog, type AddMealDialogProps } from './AddMealDialog'

// Matches FoodPickerDialog.test.tsx's own reasoning — every test here
// renders the dialog open against the full 300+-item food list. Raised
// from 25000 alongside the barcode-scan test's own findByText timeout
// below, so that test still has headroom after its 20s wait.
vi.setConfig({ testTimeout: 30000 })

const decodeFromVideoDevice = vi.fn()
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice = decodeFromVideoDevice
  },
}))

function mockScanning(barcode: string) {
  decodeFromVideoDevice.mockImplementation(
    async (_deviceId: unknown, _videoElement: unknown, callback: (result: unknown) => void) => {
      callback({ getText: () => barcode })
      return { stop: vi.fn() }
    },
  )
}

beforeEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  decodeFromVideoDevice.mockReset()
  vi.unstubAllGlobals()
})

type ControlledProps = Omit<
  AddMealDialogProps,
  | 'items'
  | 'reaction'
  | 'onAppendItems'
  | 'onRemoveItem'
  | 'onReactionChange'
  | 'note'
  | 'onNoteChange'
> & { initialItems?: CalorieItem[] }

// Mirrors MealList's own real wiring (an in-progress meal's items/reaction
// live in the *parent*, not the dialog) — a plain vi.fn() for onAppendItems
// would never let the "meal so far" list actually grow across interactions,
// same reasoning MealList.test.tsx's own ControlledMealList exists for.
function ControlledAddMealDialog({ initialItems, ...props }: ControlledProps) {
  const [items, setItems] = useState<CalorieItem[]>(initialItems ?? [])
  const [reaction, setReaction] = useState<Emotion | undefined>(undefined)
  const [note, setNote] = useState('')
  return (
    <AddMealDialog
      {...props}
      items={items}
      reaction={reaction}
      onReactionChange={setReaction}
      note={note}
      onNoteChange={setNote}
      onAppendItems={(newItems) => setItems((prev) => [...prev, ...newItems])}
      onRemoveItem={(id) =>
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
      onUpdateItem={(updated) =>
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        )
      }
    />
  )
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  mealLabel: 'Breakfast',
  timeEaten: '08:00',
  onTimeEatenChange: vi.fn(),
  note: '',
  onNoteChange: vi.fn(),
  todayTotals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
}

describe('AddMealDialog (#454)', () => {
  it('shows the meal label and time field', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Breakfast' })).toBeInTheDocument()
    expect(screen.getByLabelText('Time')).toHaveValue('08:00')
  })

  it('does not auto-focus the time field on open (#487)', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    // Pre-#487 Radix FocusScope focused the header `type="time"` input,
    // which presents the native time picker on iOS/Safari.
    expect(screen.getByLabelText('Time')).not.toHaveFocus()
  })

  it('has a meal note field next to the reaction block (#480)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAddMealDialog
        {...defaultProps}
        initialItems={[{ id: 'i1', name: 'Oatmeal', amountKcal: 250 }]}
      />,
    )

    const note = screen.getByLabelText('Meal note')
    expect(note).toHaveAttribute('placeholder', 'Note about breakfast')
    await user.type(note, 'Cheat day')
    expect(note).toHaveValue('Cheat day')
  })

  it('still offers the meal note before any food is added (#480 regression)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    // #129's flow types the note first, then adds the item — moving the
    // note next to the reaction block (which needs an item) must not drop
    // the field for an empty meal.
    const note = screen.getByLabelText('Meal note')
    await user.type(note, 'Ate chocolates')

    expect(note).toHaveValue('Ate chocolates')
  })

  it('searches the food list, confirms a quantity, and adds it to the meal so far', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))
    // Confirm-quantity step — default 100g, "+ Add item" commits it.
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    expect(screen.getByText('This meal so far')).toBeInTheDocument()
    expect(screen.getByText('Salmon')).toBeInTheDocument()
  })

  it('stays open across multiple adds, accumulating the meal live (persistent multi-add)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    // Dialog is still open and searchable — add a second dish.
    await user.clear(screen.getByLabelText('Search foods'))
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')
    await user.click(await screen.findByText('Chicken breast'))
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    const mealSoFar = screen.getByText('This meal so far').closest('div')!
    expect(mealSoFar).toHaveTextContent('Salmon')
    expect(mealSoFar).toHaveTextContent('Chicken breast')
  })

  it('shows the "was it tasty?" reaction picker once the meal has at least one item', async () => {
    const user = userEvent.setup()
    const onReactionChange = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={onReactionChange}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    expect(screen.getByText('Was it tasty?')).toBeInTheDocument()
    // EmotionPicker's aria-label includes the contextLabel suffix
    // (`${label} — ${contextLabel}`) to disambiguate from any other
    // EmotionPicker on screen — here that's the meal label itself. #459
    // switched this picker's own labelFor from emotionLabel ("Happy") to
    // mealReactionValueLabel ("Yes") to match the mockup's Yes/So-so/No
    // wording for "Was it tasty?" specifically.
    await user.click(screen.getByRole('button', { name: 'Yes — Breakfast' }))

    expect(onReactionChange).toHaveBeenCalledWith('happy')
  })

  it('does not show the reaction picker (or Done) with an empty meal', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(screen.queryByText('Was it tasty?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('removes an item from the meal so far', async () => {
    const user = userEvent.setup()
    const onRemoveItem = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', name: 'Oatmeal', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={onRemoveItem}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete item' }))

    expect(onRemoveItem).toHaveBeenCalledWith('i1')
  })

  describe('Recent (#454)', () => {
    it('shows recently-touched personal items when the search box is empty', async () => {
      await useMealItemStore.getState().touch('Homemade soup', { amountKcal: 320 })
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(await screen.findByText('Homemade soup')).toBeInTheDocument()
    })

    it('does not show a Recent section with no personal items yet', () => {
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(screen.queryByText('Recent')).not.toBeInTheDocument()
    })
  })

  describe('manual entry fallback (#454)', () => {
    it('adds a manually-typed dish via the "Add food" quick action', async () => {
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Homemade soup')
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The saved dish is also touched into the personal library, so once
      // search is empty again it can legitimately show up a second time in
      // "Recent" — scope this assertion to the meal-so-far list itself,
      // same reasoning as the "Repeat yesterday's meal" test below.
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent('Homemade soup')
    })

    it('does not race two writes to the personal food library for the same dish (regression)', async () => {
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Homemade soup')
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(
        screen.getByRole('button', { name: 'Add Homemade soup to favorites' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(
          useMealItemStore
            .getState()
            .items.filter((item) => item.name === 'Homemade soup'),
        ).toHaveLength(1),
      )
      expect(useMealItemStore.getState().items[0]).toMatchObject({
        name: 'Homemade soup',
        favorite: true,
      })
    })
  })

  describe('barcode scanning', () => {
    it('resolves a local match straight to the quantity-confirm step, not the manual sheet', async () => {
      await useMealItemStore
        .getState()
        .touch(
          'Protein Bar',
          { amountKcal: 200, proteinG: 20 },
          undefined,
          '0123456789012',
        )
      mockScanning('0123456789012')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      // findByText's own default ~1000ms poll window (distinct from this
      // file's own *test* timeout below) can be too short for the real
      // async chain here — BarcodeScannerDialog's dynamic
      // `@zxing/browser`/`@zxing/library` import, then the mocked decode
      // callback, then lookupBarcode's own IndexedDB round-trip — a real,
      // reproducible flake under load, not a one-off. Bumped once already
      // (10000ms) and still timed out under a full-suite CI run's heavier
      // load; raised further with headroom under the file's own timeout.
      expect(
        await screen.findByText('Protein Bar', {}, { timeout: 20000 }),
      ).toBeInTheDocument()
      expect(
        screen.queryByLabelText('Dish name'),
      ).not.toBeInTheDocument()
      // Wait for the quantity-confirm step itself — under full-suite CI load
      // the scanner dialog can still be open when Protein Bar first appears
      // (e.g. in a parent layer), so clicking "+ Add item" immediately used
      // to flake. findByRole polls until that step is actually mounted.
      await user.click(
        await screen.findByRole(
          'button',
          { name: '+ Add item' },
          { timeout: 20000 },
        ),
      )

      expect(screen.getByText('This meal so far')).toBeInTheDocument()
      expect(screen.getAllByText('Protein Bar').length).toBeGreaterThan(0)
    })

    it('falls back to the manual sheet when nothing matches anywhere', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Dish name')).toHaveValue('')
    })
  })

  describe("Repeat yesterday's meal", () => {
    it('offers to repeat when a previous meal is passed, appending the selected items', async () => {
      const user = userEvent.setup()
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          previousMeal={{
            items: [{ id: 'yi1', name: 'Eggs', amountKcal: 150 }],
          }}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: "Repeat yesterday's Breakfast" }),
      )
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      // A repeated item is also touched into the personal library, so once
      // search is empty again it can legitimately show up a second time in
      // "Recent" — scope this assertion to the meal-so-far list itself.
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent('Eggs')
    })

    it('does not offer to repeat when there is no previous meal', () => {
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(
        screen.queryByRole('button', { name: /Repeat yesterday's/ }),
      ).not.toBeInTheDocument()
    })
  })

  describe('logging a recipe', () => {
    it('adds a new item from the logged recipe, scaled by servings eaten', async () => {
      await db.recipes.put({
        id: 'recipe-1',
        name: 'Chili',
        servings: 4,
        ingredients: [
          { id: 'ing-1', name: 'Ground beef', amountKcal: 800, proteinG: 60 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Log recipe' }))
      await user.click(await screen.findByRole('button', { name: 'Chili' }))
      const servingsInput = screen.getByLabelText('Servings eaten')
      await user.clear(servingsInput)
      await user.type(servingsInput, '2')
      await user.click(screen.getByRole('button', { name: 'Log' }))

      expect(screen.getByText('This meal so far')).toBeInTheDocument()
      expect(screen.getByText('Chili')).toBeInTheDocument()
    })
  })

  it('calls onOpenChange(false) when Done is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('gives Done the same 48px footer-CTA size as every other primary footer action (#474)', () => {
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    // It used to be the default h-8 size with only w-full, which read as
    // visibly smaller than MealItemEditorSheet's Save right next to it.
    const done = screen.getByRole('button', { name: 'Done' })
    expect(done).toHaveClass('h-12')
    expect(done).not.toHaveClass('h-8')
  })

  it('does not auto-focus the dish name when editing an existing item (#475)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAddMealDialog
        {...defaultProps}
        initialItems={[{ id: 'i1', name: 'Oatmeal', amountKcal: 250 }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit item' }))

    expect(
      await screen.findByRole('heading', { name: 'Edit item' }),
    ).toBeInTheDocument()
    const nameInput = screen.getByLabelText('Dish name')
    expect(nameInput).toHaveValue('Oatmeal')
    // Pre-#475 Radix FocusScope focused the first tabbable and called
    // `.select()`, so a stray keystroke replaced the whole name.
    expect(nameInput).not.toHaveFocus()
  })
})
