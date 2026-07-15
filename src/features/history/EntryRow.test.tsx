import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { EntryRow } from './EntryRow'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [{ id: 'calorie-1', amountKcal: 2000, createdAt: now }],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function renderRow(props: Partial<Parameters<typeof EntryRow>[0]> = {}) {
  return render(
    <table>
      <tbody>
        <EntryRow
          entry={makeEntry()}
          onSaved={vi.fn()}
          onDeleted={vi.fn()}
          {...props}
        />
      </tbody>
    </table>,
  )
}

describe('EntryRow', () => {
  it('shows the entry values, and a dash for missing note', () => {
    renderRow()

    expect(screen.getByText('2,000')).toBeInTheDocument()
    expect(screen.getByText('80 kg')).toBeInTheDocument()
    expect(screen.getAllByText('—')).not.toHaveLength(0)
  })

  it('expands into the daily entry form on edit, weight already editable with its own Save button', async () => {
    const user = userEvent.setup()
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))

    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
    expect(
      screen.getByRole('button', { name: 'Save weight' }),
    ).toBeInTheDocument()
  })

  it('returns to view mode on "Done" without requiring a separate save', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderRow({ onSaved })

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('calls onSaved as soon as a field is saved, without collapsing back to view mode', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderRow({ onSaved })

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    const weightInput = screen.getByLabelText('Weight (kg)')
    await user.clear(weightInput)
    await user.type(weightInput, '79.5')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onSaved.mock.calls[0][0].weightKg).toBe(79.5)
    // Still in edit mode — saving one field doesn't exit the row, since the
    // user might also want to add/edit a meal or the note in this session.
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
  })

  it('requires a two-step confirm before deleting', async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    renderRow({ onDeleted })

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByText('Delete this entry?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeleted).toHaveBeenCalledWith('entry-1')
  })

  it('cancels the delete confirm without calling onDeleted', async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    renderRow({ onDeleted })

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDeleted).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Delete entry' }),
    ).toBeInTheDocument()
  })

  describe('expand/collapse detail view', () => {
    it('is collapsed by default, with no meal details visible', () => {
      renderRow({
        entry: makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              note: 'Pasta for lunch',
              emotion: 'thumbsUp',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      expect(screen.queryByText('Pasta for lunch')).not.toBeInTheDocument()
    })

    it('shows meal notes and emotions read-only, without opening edit mode', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({
          note: 'Went for a long walk',
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              note: 'Pasta for lunch',
              emotion: 'thumbsUp',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))

      expect(screen.getByText('Meal 1 — 500 kcal')).toBeInTheDocument()
      expect(screen.getByText('Pasta for lunch')).toBeInTheDocument()
      expect(screen.getByText('Thumbs up')).toBeInTheDocument()
      // Read-only: no edit affordances leaked into the expanded panel itself.
      expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Edit meal/ }),
      ).not.toBeInTheDocument()
    })

    it('collapses again on a second click', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))
      expect(screen.getByText('Meal 1 — 500 kcal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Hide details' }))
      expect(screen.queryByText('Meal 1 — 500 kcal')).not.toBeInTheDocument()
    })

    it('shows a quiet fallback when there is nothing to expand', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({ note: undefined, calorieEntries: [] }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))

      expect(
        screen.getByText('Nothing else logged for this day.'),
      ).toBeInTheDocument()
    })

    it('survives a cancelled delete confirm without collapsing', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              amountKcal: 500,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))
      await user.click(screen.getByRole('button', { name: 'Delete entry' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByText('Meal 1 — 500 kcal')).toBeInTheDocument()
    })
  })
})
