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
          goal={null}
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
    expect(screen.getByText('80.0 kg')).toBeInTheDocument()
    expect(screen.getAllByText('—')).not.toHaveLength(0)
  })

  it('expands into the daily entry form on edit', async () => {
    const user = userEvent.setup()
    renderRow()

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))

    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
    expect(
      screen.getByRole('button', { name: 'Update entry' }),
    ).toBeInTheDocument()
  })

  it('returns to view mode on cancel without saving', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderRow({ onSaved })

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('calls onSaved after a successful edit submit', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderRow({ onSaved })

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    await user.click(screen.getByRole('button', { name: 'Update entry' }))

    expect(onSaved).toHaveBeenCalledTimes(1)
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
})
