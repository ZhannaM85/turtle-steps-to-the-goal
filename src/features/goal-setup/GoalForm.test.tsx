import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProfileStore, useUnitStore } from '@/stores'
import { GoalForm } from './GoalForm'

afterEach(() => {
  useUnitStore.setState({ unit: 'kg' })
  useProfileStore.setState({
    heightCm: undefined,
    age: undefined,
    sex: undefined,
    activityLevel: undefined,
  })
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

  describe('daily calorie target (#208)', () => {
    it('is optional — submits fine when left blank', async () => {
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
      expect(
        onSubmit.mock.calls[0][0].dailyCalorieTargetKcal,
      ).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(
        screen.getByLabelText('Daily calories target'),
        '1800',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyCalorieTargetKcal).toBe(1800)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyCalorieTargetKcal: 1800,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
        />,
      )

      // #244: existing goals start as a read-only summary now, not the
      // form — open it via the edit pencil first.
      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily calories target')).toHaveValue(
        '1800',
      )
    })
  })

  describe('daily protein target (#220)', () => {
    it('is optional — submits fine when left blank', async () => {
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
      expect(onSubmit.mock.calls[0][0].dailyProteinTargetG).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(screen.getByLabelText('Daily protein target'), '120')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyProteinTargetG).toBe(120)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyProteinTargetG: 120,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily protein target')).toHaveValue(
        '120',
      )
    })
  })

  describe('daily fat target (#252)', () => {
    it('is optional — submits fine when left blank', async () => {
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
      expect(onSubmit.mock.calls[0][0].dailyFatTargetG).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(screen.getByLabelText('Daily fat target'), '60')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyFatTargetG).toBe(60)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyFatTargetG: 60,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily fat target')).toHaveValue('60')
    })
  })

  describe('daily carb target (#252)', () => {
    it('is optional — submits fine when left blank', async () => {
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
      expect(onSubmit.mock.calls[0][0].dailyCarbTargetG).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(screen.getByLabelText('Daily carb target'), '200')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyCarbTargetG).toBe(200)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyCarbTargetG: 200,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily carb target')).toHaveValue('200')
    })
  })

  describe('suggest a target (#259)', () => {
    it('disables the button and shows a hint when profile data is incomplete', () => {
      render(<GoalForm existingGoal={null} onSubmit={vi.fn()} />)

      expect(
        screen.getByRole('button', { name: 'Suggest a target' }),
      ).toBeDisabled()
      expect(
        screen.getByText(/Log a weight, and set your height/),
      ).toBeInTheDocument()
    })

    it('stays disabled with a profile but no logged weight', () => {
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      render(
        <GoalForm existingGoal={null} onSubmit={vi.fn()} latestWeightKg={null} />,
      )

      expect(
        screen.getByRole('button', { name: 'Suggest a target' }),
      ).toBeDisabled()
    })

    it('fills in all four target fields once every input is available', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      render(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          latestWeightKg={70}
        />,
      )

      const button = screen.getByRole('button', { name: 'Suggest a target' })
      expect(button).toBeEnabled()
      await user.click(button)

      // BMR (Mifflin-St Jeor, female, 70kg/165cm/30y) = 1420.25,
      // TDEE (sedentary x1.2) = 1704.3, no weekly pace typed in => 0 deficit.
      expect(screen.getByLabelText('Daily calories target')).toHaveValue(
        '1704',
      )
      expect(screen.getByLabelText('Daily protein target')).toHaveValue(
        '112',
      )
      expect(screen.getByLabelText('Daily fat target')).toHaveValue('56')
      expect(screen.getByLabelText('Daily carb target')).toHaveValue('188')
    })

    it('factors in the typed weekly-pace deficit when present', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      render(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          latestWeightKg={70}
        />,
      )

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Suggest a target' }),
      )

      // Same TDEE as above (1704) minus the ~1100 kcal/day deficit implied
      // by a 1kg/week pace — asserting it's meaningfully lower confirms
      // the deficit was actually applied, without hard-coding the exact
      // calorieDeficit.ts constant here.
      const calorieField = screen.getByLabelText(
        'Daily calories target',
      ) as HTMLInputElement
      expect(Number(calorieField.value)).toBeLessThan(700)
    })

    it('does not save anything on its own — only fills the fields', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      render(
        <GoalForm existingGoal={null} onSubmit={onSubmit} latestWeightKg={70} />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Suggest a target' }),
      )

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('read-only summary table (#244, extended #252)', () => {
    it('shows "Not set" for fat/carb targets when unset', () => {
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

      expect(screen.getByText('Daily fat target')).toBeInTheDocument()
      expect(screen.getByText('Daily carb target')).toBeInTheDocument()
      expect(screen.getAllByText('Not set').length).toBeGreaterThanOrEqual(2)
    })

    it('shows the fat/carb target values when set', () => {
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyFatTargetG: 60,
            dailyCarbTargetG: 200,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
        />,
      )

      expect(screen.getByText('60 g')).toBeInTheDocument()
      expect(screen.getByText('200 g')).toBeInTheDocument()
    })
  })

  it('pre-fills from an existing goal and labels the submit button as an update', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('button', { name: 'Edit goal' }))

    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toHaveValue('1')
    expect(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    ).toBeInTheDocument()
  })

  describe('editing the current week in place (#181, follow-up in #182)', () => {
    it('keeps the button enabled and saves even when the value is unchanged (#182)', async () => {
      // #181 briefly disabled Update whenever the pre-filled value already
      // matched the live goal — including on ordinary page load, which
      // read as broken since it happened by default, not just after a
      // pointless resubmit attempt. #182 removed that: an unchanged
      // resubmit is harmless (idempotent update to the same record), so
      // there's no reason to block it.
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const today = new Date().toISOString().slice(0, 10)
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      const button = screen.getByRole('button', {
        name: 'Update this week’s target',
      })
      expect(button).toBeEnabled()

      await user.click(button)

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        id: 'g1',
        targetWeeklyLossKg: 1,
      })
    })

    it('still saves a genuinely different target within the same live window', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const today = new Date().toISOString().slice(0, 10)
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      const input = screen.getByLabelText("This week's target (kg to lose)")
      await user.clear(input)
      await user.type(input, '1.5')
      await user.click(
        screen.getByRole('button', { name: 'Update this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      // Edits in place (#181) — same id/createdAt, not a new record.
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        id: 'g1',
        createdAt: '2026-01-01T00:00:00.000Z',
        targetWeeklyLossKg: 1.5,
      })
    })

    it('stays enabled for a same-value renewal once the window has ended', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2020-01-01',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      const button = screen.getByRole('button', {
        name: 'Update this week’s target',
      })
      expect(button).toBeEnabled()

      await user.click(button)

      expect(onSubmit).toHaveBeenCalledTimes(1)
      // Starts a fresh record (#181) — the old goal's window already ended.
      expect(onSubmit.mock.calls[0][0].id).not.toBe('g1')
    })
  })

  it('clears all three fields once a save succeeds (#241)', async () => {
    // Explicitly requested by the user: not just a confirmation next to
    // the button, the fields themselves must go blank. Current value is
    // visible via the read-only summary (#244) this collapses back to,
    // not the form itself. existingGoal is null here specifically so it
    // starts already in edit mode.
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalForm existingGoal={null} onSubmit={onSubmit} />)

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '1',
    )
    await user.type(screen.getByLabelText('Daily calories target'), '1800')
    await user.type(screen.getByLabelText('Daily protein target'), '120')
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toHaveValue('')
    expect(screen.getByLabelText('Daily calories target')).toHaveValue('')
    expect(screen.getByLabelText('Daily protein target')).toHaveValue('')
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
