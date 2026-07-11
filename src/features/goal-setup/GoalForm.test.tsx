import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GoalForm } from './GoalForm'

describe('GoalForm', () => {
  it('defaults to kg units and weekly-pace mode', () => {
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Weekly pace' })).toBeChecked()
    expect(screen.getByLabelText('Weekly pace (kg/week)')).toBeInTheDocument()
  })

  it('shows a validation error when the weekly pace is left at 0', async () => {
    const user = userEvent.setup()
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Starting weight (kg)'), '80')
    await user.type(screen.getByLabelText('Target weight (kg)'), '70')
    await user.click(screen.getByRole('button', { name: 'Set goal' }))

    expect(
      await screen.findByText('Enter a weekly pace greater than 0'),
    ).toBeInTheDocument()
  })

  it('shows the calorie deficit estimate with a non-medical-advice caveat once the pace is valid', async () => {
    const user = userEvent.setup()
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Starting weight (kg)'), '80')
    await user.type(screen.getByLabelText('Target weight (kg)'), '70')
    await user.type(screen.getByLabelText('Weekly pace (kg/week)'), '1')

    expect(
      await screen.findByText(/about 1100 kcal\/day deficit/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not medical or nutritional advice/),
    ).toBeInTheDocument()
  })

  it('submits a Goal with canonical kg values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Starting weight (kg)'), '80')
    await user.type(screen.getByLabelText('Target weight (kg)'), '70')
    await user.type(screen.getByLabelText('Weekly pace (kg/week)'), '1')
    await user.click(screen.getByRole('button', { name: 'Set goal' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const goal = onSubmit.mock.calls[0][0]
    expect(goal.startWeightKg).toBe(80)
    expect(goal.targetWeightKg).toBe(70)
    expect(goal.targetWeeklyLossKg).toBe(1)
    expect(goal.displayUnit).toBe('kg')
    expect(goal.id).toBeTruthy()
  })

  it('switches to a target-date field in targetDate pace mode', async () => {
    const user = userEvent.setup()
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: 'Target date' }))

    expect(
      screen.getByLabelText('Target date', { selector: 'input[type="date"]' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Weekly pace (kg/week)'),
    ).not.toBeInTheDocument()
  })

  it('pre-fills from an existing goal and labels the submit button as an update', () => {
    render(
      <GoalForm
        existingGoal={{
          id: 'g1',
          startDate: '2026-01-01',
          startWeightKg: 80,
          targetWeightKg: 70,
          targetWeeklyLossKg: 1,
          displayUnit: 'kg',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Starting weight (kg)')).toHaveValue('80')
    expect(
      screen.getByRole('button', { name: 'Update goal' }),
    ).toBeInTheDocument()
  })

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Starting weight (kg)'), '80,5')
    await user.type(screen.getByLabelText('Target weight (kg)'), '70')
    await user.type(screen.getByLabelText('Weekly pace (kg/week)'), '1')
    await user.click(screen.getByRole('button', { name: 'Set goal' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].startWeightKg).toBe(80.5)
  })
})
