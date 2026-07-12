import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DailyEntryForm } from './DailyEntryForm'

describe('DailyEntryForm', () => {
  it('labels the submit button "Log entry" when there is no existing entry', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Log entry' }),
    ).toBeInTheDocument()
  })

  it('requires at least a weight or a calorie total', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(
      await screen.findByText('Enter a weight or a calorie total'),
    ).toBeInTheDocument()
  })

  it('submits with just a weight (partial entry)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '79.5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const entry = onSubmit.mock.calls[0][0]
    expect(entry.date).toBe('2026-03-01')
    expect(entry.weightKg).toBe(79.5)
    expect(entry.caloriesConsumed).toBeUndefined()
  })

  it('rejects an unrealistic weight', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(await screen.findByText(/Too small/)).toBeInTheDocument()
  })

  it('pre-fills from an existing entry and labels the button as an update', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={{
          id: 'e1',
          date: '2026-03-01',
          weightKg: 80,
          caloriesConsumed: 2000,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
    expect(screen.getByLabelText('Calories')).toHaveValue('2000')
    expect(
      screen.getByRole('button', { name: 'Update entry' }),
    ).toBeInTheDocument()
  })

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '79,5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].weightKg).toBe(79.5)
  })

  it('adds to an empty calories field via the quick-add control', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByLabelText('Calories')).toHaveValue('200')
    expect(screen.getByLabelText('Add calories')).toHaveValue('')
  })

  it('accumulates repeated quick-adds onto the existing calories total', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={{
          id: 'e1',
          date: '2026-03-01',
          caloriesConsumed: 400,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByLabelText('Calories')).toHaveValue('600')

    await user.type(screen.getByLabelText('Add calories'), '150')
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Calories')).toHaveValue('750')
  })

  it('ignores a quick-add of zero or an empty amount', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByLabelText('Calories')).toHaveValue('')

    await user.type(screen.getByLabelText('Add calories'), '0')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByLabelText('Calories')).toHaveValue('')
  })

  it('does not submit the form when pressing Enter in the quick-add field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.keyboard('{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Calories')).toHaveValue('200')
  })
})
