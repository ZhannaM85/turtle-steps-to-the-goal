import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUnitStore } from '@/stores'
import { GoalForm } from './GoalForm'

afterEach(() => {
  useUnitStore.setState({ unit: 'kg' })
})

describe('GoalForm', () => {
  it('defaults to kg units', () => {
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toBeInTheDocument()
  })

  it('labels and converts the target using the current unit preference', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    useUnitStore.setState({ unit: 'lb' })
    render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

    const input = screen.getByLabelText("This week's target (lb to lose)")
    await user.type(input, '2.2')
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetWeeklyLossKg).toBeCloseTo(1, 1)
  })

  it('shows a validation error when the weekly target is left empty', async () => {
    const user = userEvent.setup()
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(
      await screen.findByText("Enter this week's target, greater than 0"),
    ).toBeInTheDocument()
  })

  it('shows the calorie deficit estimate with a non-medical-advice caveat once the target is valid', async () => {
    const user = userEvent.setup()
    render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '1',
    )

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

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '1',
    )
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const goal = onSubmit.mock.calls[0][0]
    expect(goal.targetWeeklyLossKg).toBe(1)
    expect(goal.id).toBeTruthy()
  })

  it('pre-fills from an existing goal and labels the submit button as an update', () => {
    render(
      <GoalForm
        existingGoal={{
          id: 'g1',
          targetWeeklyLossKg: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toHaveValue('1')
    expect(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    ).toBeInTheDocument()
  })

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '1,5',
    )
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetWeeklyLossKg).toBe(1.5)
  })
})
