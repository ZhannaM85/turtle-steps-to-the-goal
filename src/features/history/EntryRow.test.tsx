import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { EntryRow } from './EntryRow'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: 'calorie-1',
        items: [{ id: 'item-1', amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function renderRow(props: Partial<Parameters<typeof EntryRow>[0]> = {}) {
  // MemoryRouter (#157) — MealList (mounted here via DailyEntryForm's
  // alwaysEditable edit mode) now calls useNavigate() for its meal-pencil
  // navigation, which throws outside a Router context.
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <EntryRow
            entry={makeEntry()}
            onSaved={vi.fn()}
            onDeleted={vi.fn()}
            {...props}
          />
        </tbody>
      </table>
    </MemoryRouter>,
  )
}

describe('EntryRow', () => {
  it('shows the entry values, and a dash for missing note', () => {
    renderRow()

    expect(screen.getByText('2,000')).toBeInTheDocument()
    // Unit suffix lives in the column header, not the row, since #246 —
    // the row just shows the number.
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getAllByText('—')).not.toHaveLength(0)
  })

  it('shows the date in a compact, locale-agnostic numeric format (#73)', () => {
    renderRow()

    expect(screen.getByText('01.03.26')).toBeInTheDocument()
  })

  it('shows the day\'s macro totals under calories, omitted when nothing logged (#52)', () => {
    renderRow()

    expect(screen.queryByText(/^P /)).not.toBeInTheDocument()
  })

  it("shows the day's macro totals under calories when logged (#52)", () => {
    renderRow({
      entry: makeEntry({
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 2000, proteinG: 20, fatG: 10 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    })

    expect(screen.getByText('P 20g · F 10g · C —')).toBeInTheDocument()
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
              items: [{ id: 'i1', amountKcal: 500, emotion: 'thumbsUp' }],
              note: 'Pasta for lunch',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      expect(screen.queryByText('Pasta for lunch')).not.toBeInTheDocument()
    })

    it('shows meal notes and emotions without opening the full day-edit form', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({
          note: 'Went for a long walk',
          calorieEntries: [
            {
              id: 'c1',
              items: [{ id: 'i1', amountKcal: 500, emotion: 'thumbsUp' }],
              note: 'Pasta for lunch',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))

      expect(screen.getByText('Breakfast — 500 kcal')).toBeInTheDocument()
      expect(screen.getByText('Pasta for lunch')).toBeInTheDocument()
      expect(screen.getByText('Thumbs up')).toBeInTheDocument()
      // #145: meals are directly editable in the expanded panel now (an
      // "Edit meal" button exists), but the day-level fields (Weight,
      // Sleep, Steps, Note) still don't leak in the way EntryRow's own
      // "Edit" (alwaysEditable) mode does.
      expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Edit meal/ }),
      ).toBeInTheDocument()
    })

    it('a meal\'s pencil in the expanded panel navigates to the dedicated edit route, without opening "Edit entry" (#145, #157)', async () => {
      const user = userEvent.setup()
      const onSaved = vi.fn()
      renderRow({
        onSaved,
        entry: makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              items: [{ id: 'i1', amountKcal: 500 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))
      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))

      // No inline edit UI opens — the pencil navigates to
      // /entry/:date/meal/:mealId instead (exhaustive edit/save coverage
      // now lives in MealEditScreen.test.tsx). Also confirms "Edit entry"
      // day-level mode never opened.
      expect(
        screen.queryByLabelText('Meal name — Meal 1'),
      ).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
      expect(onSaved).not.toHaveBeenCalled()
    })

    it('collapses again on a second click', async () => {
      const user = userEvent.setup()
      renderRow({
        entry: makeEntry({
          calorieEntries: [
            {
              id: 'c1',
              items: [{ id: 'i1', amountKcal: 500 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))
      expect(screen.getByText('Breakfast — 500 kcal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Hide details' }))
      expect(screen.queryByText('Breakfast — 500 kcal')).not.toBeInTheDocument()
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
              items: [{ id: 'i1', amountKcal: 500 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      })

      await user.click(screen.getByRole('button', { name: 'View details' }))
      await user.click(screen.getByRole('button', { name: 'Delete entry' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByText('Breakfast — 500 kcal')).toBeInTheDocument()
    })
  })

  describe('reached-goal-window highlighting (#155)', () => {
    it('marks the exact reach day distinctly from the rest of the window', () => {
      renderRow({ isGoalReachedDay: true })

      expect(
        screen.getByText('You reached your target this day', {
          selector: '.sr-only',
        }),
      ).toBeInTheDocument()
    })

    it('marks the rest of a reached window without the reach-day label', () => {
      renderRow({ isPartOfReachedGoalWindow: true })

      expect(
        screen.getByText('Part of a week you reached your target', {
          selector: '.sr-only',
        }),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('You reached your target this day'),
      ).not.toBeInTheDocument()
    })

    it('adds no reached-goal marker by default', () => {
      renderRow()

      expect(
        screen.queryByText('Part of a week you reached your target'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText('You reached your target this day'),
      ).not.toBeInTheDocument()
    })
  })
})
