import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProfileStore, useTrackedFieldsStore, useUnitStore } from '@/stores'
import { GoalForm } from './GoalForm'

/** `useBlocker` requires a data router (#534). */
function renderGoalForm(ui: React.ReactElement, initialPath = '/goal') {
  const router = createMemoryRouter(
    [
      {
        path: '/goal',
        element: (
          <div>
            {ui}
            <Link to="/other">Leave goal</Link>
          </div>
        ),
      },
      { path: '/other', element: <div>other screen</div> },
    ],
    { initialEntries: [initialPath] },
  )
  return { ...render(<RouterProvider router={router} />), router }
}

afterEach(() => {
  useUnitStore.setState({ unit: 'kg' })
  useProfileStore.setState({
    heightCm: undefined,
    age: undefined,
    sex: undefined,
    activityLevel: undefined,
  })
  useTrackedFieldsStore.setState({
    tracked: { ...useTrackedFieldsStore.getState().tracked, fiber: true },
  })
  vi.useRealTimers()
})

describe('GoalForm', () => {
  it('defaults to kg units', () => {
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toBeInTheDocument()
  })

  it('labels and converts the target using the current unit preference', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    useUnitStore.setState({ unit: 'lb' })
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

    const input = screen.getByLabelText("This week's target (lb to lose)")
    await user.type(input, '2.2')
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetWeeklyLossKg).toBeCloseTo(1, 1)
  })

  it("captures the current latestWeightKg as the fresh goal's baselineWeightKg (#676)", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderGoalForm(
      <GoalForm
        existingGoal={null}
        onSubmit={onSubmit}
        onDelete={vi.fn()}
        latestWeightKg={58.65}
      />,
    )

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '1',
    )
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(onSubmit.mock.calls[0][0].baselineWeightKg).toBe(58.65)
  })

  it('shows a validation error when the weekly target is left empty', async () => {
    const user = userEvent.setup()
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(
      await screen.findByText("Enter this week's target, greater than 0"),
    ).toBeInTheDocument()
  })

  it('shows the calorie deficit estimate with a non-medical-advice caveat once the target is valid', async () => {
    const user = userEvent.setup()
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

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
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyCalorieTargetKcal: 1800,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyProteinTargetG: 120,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyFatTargetG: 60,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyCarbTargetG: 200,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily carb target')).toHaveValue('200')
    })
  })

  describe('daily fiber target (#341)', () => {
    it('is optional — submits fine when left blank', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyFiberTargetG).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(screen.getByLabelText('Daily fiber target'), '25')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyFiberTargetG).toBe(25)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyFiberTargetG: 25,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily fiber target')).toHaveValue('25')
    })

    it('fills fiber when Suggest a target runs (#582)', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          latestWeightKg={70}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Suggest a target' }),
      )
      expect(screen.getByLabelText('Daily fiber target')).toHaveValue('25')
    })

    it('offers a soft fiber suggestion when profile sex is set (#582)', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} latestWeightKg={70} />,
      )

      expect(
        screen.getByText(/common adult ballpark is about 25 g\/day/i),
      ).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Use suggested fiber' }),
      )
      expect(screen.getByLabelText('Daily fiber target')).toHaveValue('25')
    })

    it('hides fiber target when Fiber is off in What to track (#590)', () => {
      useTrackedFieldsStore.setState({
        tracked: { ...useTrackedFieldsStore.getState().tracked, fiber: false },
      })
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyFiberTargetG: 25,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
      expect(screen.queryByText('Daily fiber target')).not.toBeInTheDocument()
    })
  })

  describe('daily water target (#258)', () => {
    it('is optional — submits fine when left blank', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyWaterTargetMl).toBeUndefined()
    })

    it('submits the value when filled in', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.type(screen.getByLabelText('Daily water target'), '2000')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].dailyWaterTargetMl).toBe(2000)
    })

    it('pre-fills from an existing goal', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyWaterTargetMl: 2000,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Daily water target')).toHaveValue('2000')
    })

    it('shows the value on the read-only summary table', () => {
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            dailyWaterTargetMl: 2000,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(screen.getByText('Daily water target')).toBeInTheDocument()
      expect(screen.getByText('2,000 ml')).toBeInTheDocument()
    })
  })

  describe('suggest a target (#259)', () => {
    it('disables the button and shows a hint when profile data is incomplete', () => {
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

      expect(
        screen.getByRole('button', { name: 'Suggest a target' }),
      ).toBeDisabled()
      expect(
        screen.getAllByText(/Log a weight, and set your height/).length,
      ).toBeGreaterThanOrEqual(1)
    })

    it('stays disabled with a profile but no logged weight', () => {
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} latestWeightKg={null} />,
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
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
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
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
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
      renderGoalForm(
        <GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} latestWeightKg={70} />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Suggest a target' }),
      )

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('contextual recalculate buttons (#569/#573)', () => {
    it('shows Recalculate from calories after typing calories; click fills pace and macros', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          latestWeightKg={70}
        />,
      )

      expect(
        screen.queryByRole('button', {
          name: 'Estimate weekly pace from these calories',
        }),
      ).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Daily calories target'), '1154')
      const recalcButton = screen.getByRole('button', {
        name: 'Recalculate from calories',
      })
      expect(recalcButton).toBeInTheDocument()
      await user.click(recalcButton)

      expect(
        screen.getByLabelText("This week's target (kg to lose)"),
      ).toHaveValue('0.5')
      expect(screen.getByLabelText('Daily protein target')).toHaveValue('112')
      expect(screen.getByLabelText('Daily fat target')).toHaveValue('56')
      expect(screen.getByLabelText('Daily carb target')).toHaveValue('51')
    })

    it('does not show Recalculate after typing protein (#573)', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          latestWeightKg={70}
        />,
      )

      await user.type(screen.getByLabelText('Daily protein target'), '120')
      expect(
        screen.queryByRole('button', { name: /Recalculate from/ }),
      ).not.toBeInTheDocument()
    })
  })

  describe('pace vs calories mismatch (#574)', () => {
    it('replaces the deficit estimate when calories imply a surplus', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({
        heightCm: 165,
        age: 30,
        sex: 'female',
        activityLevel: 'sedentary',
      })
      renderGoalForm(
        <GoalForm
          existingGoal={null}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          latestWeightKg={70}
        />,
      )

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '0.1',
      )
      expect(
        await screen.findByText(/about 110 kcal\/day deficit/),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText('Daily calories target'), '5002')

      expect(
        screen.queryByText(/about 110 kcal\/day deficit/),
      ).not.toBeInTheDocument()
      const mismatch = screen.getByRole('status')
      expect(mismatch).toHaveTextContent(
        /daily calories and weekly pace don’t match/i,
      )
      expect(mismatch).toHaveClass('bg-amber-500/15')
    })
  })

  describe('read-only summary table (#244, extended #252)', () => {
    it('shows "Not set" for fat/carb targets when unset', () => {
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(screen.getByText('Daily fat target')).toBeInTheDocument()
      expect(screen.getByText('Daily carb target')).toBeInTheDocument()
      expect(screen.getAllByText('Not set').length).toBeGreaterThanOrEqual(2)
    })

    it('shows the fat/carb target values when set', () => {
      renderGoalForm(
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
          onDelete={vi.fn()}
        />,
      )

      expect(screen.getByText('60 g')).toBeInTheDocument()
      expect(screen.getByText('200 g')).toBeInTheDocument()
    })
  })

  it('pre-fills from an existing goal and labels the submit button as an update', async () => {
    const user = userEvent.setup()
    renderGoalForm(
      <GoalForm
        existingGoal={{
          id: 'g1',
          targetWeeklyLossKg: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        onSubmit={vi.fn()}
          onDelete={vi.fn()}
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

  describe('editing the current week in place (#181, redesigned for #386)', () => {
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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
      onDelete={vi.fn()}
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
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
      onDelete={vi.fn()}
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

    // #386 — reported live: the previous design auto-detected an ended
    // window and silently started a fresh record even via the plain Edit
    // button, invisible to the user. Edit now always means edit-in-place,
    // unconditionally — the only way to get a fresh record is the
    // separate, always-visible "Start a new goal" button below.
    it('still edits in place via the pencil even once the window has long ended', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2020-01-01',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
      onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await user.click(
        screen.getByRole('button', { name: 'Update this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        id: 'g1',
        weekStart: '2020-01-01',
      })
    })
  })

  describe('explicit "Start a new goal" CTA (#386)', () => {
    it('is always enabled, including while the window is still running (#683)', () => {
      const today = new Date().toISOString().slice(0, 10)
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
      const startNewButton = screen.getByRole('button', {
        name: 'Start a new goal',
      })
      expect(startNewButton).toBeInTheDocument()
      expect(startNewButton).toBeEnabled()
      expect(
        screen.getByText(/Begins a fresh window/),
      ).toBeInTheDocument()
    })

    it('is enabled once the goal window has actually ended (#639)', () => {
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2020-01-01',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Start a new goal' }),
      ).toBeEnabled()
    })

    it('is enabled immediately when the caller reports the window concluded early, even though the plain calendar check alone would still say running (#667)', () => {
      const today = new Date().toISOString().slice(0, 10)
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: today, // weekEnd is today — calendar check alone: not ended
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          activeGoalConcluded // reached on the window's own last day
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Start a new goal' }),
      ).toBeEnabled()
    })

    it('is enabled for a legacy goal with no weekStart at all (pre-#135)', () => {
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Start a new goal' }),
      ).toBeEnabled()
    })

    it('opens the form labeled as Set (not Update) once clicked', async () => {
      const user = userEvent.setup()
      const endedWeekStart = '2020-01-01'
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: endedWeekStart,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Start a new goal' }),
      )

      expect(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      ).toBeInTheDocument()
    })

    it('starts a fresh record when submitted, instead of editing the existing goal in place', async () => {
      // Freezes the clock so `today` (captured here) and the code under
      // test's own `new Date()` (called on submit, after several real async
      // interactions) can't ever disagree — a real midnight rollover during
      // a long full-suite run once made this fail non-deterministically.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T12:00:00'))
      const user = userEvent.setup({ delay: null })
      const onSubmit = vi.fn()
      const today = new Date().toISOString().slice(0, 10)
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2020-01-01', // ended, so restart is enabled
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
      onDelete={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Start a new goal' }),
      )
      const input = screen.getByLabelText("This week's target (kg to lose)")
      await user.clear(input)
      await user.type(input, '0.1')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      const goal = onSubmit.mock.calls[0][0]
      expect(goal.id).not.toBe('g1')
      // A fresh record's own window always starts today, regardless of the
      // superseded goal's own (ended) weekStart.
      expect(goal.weekStart).toBe(today)
      expect(goal.targetWeeklyLossKg).toBe(0.1)
    })

    it('starts a fresh record once the previous window has ended, regardless of its own target value (#155)', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 0.1,
            weekStart: '2020-01-01', // ended, so restart is enabled
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
      onDelete={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Start a new goal' }),
      )
      // #534 — Start a new goal clears the form (no longer reuses the live
      // goal's values), so a weekly pace must be entered before Set.
      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '0.2',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit.mock.calls[0][0].id).not.toBe('g1')
    })
  })

  describe('editable end date (#659)', () => {
    it('defaults to weekStart + 6 days and submits it unchanged', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T12:00:00'))
      const user = userEvent.setup({ delay: null })
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      expect(screen.getByLabelText('Starts on')).toHaveValue('2026-07-24')
      expect(screen.getByLabelText('Ends on')).toHaveValue('2026-07-30')

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit.mock.calls[0][0].weekStart).toBe('2026-07-24')
      expect(onSubmit.mock.calls[0][0].weekEnd).toBe('2026-07-30')
      vi.useRealTimers()
    })

    it('submits a custom end date when edited', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      fireEvent.change(screen.getByLabelText('Ends on'), {
        target: { value: '2026-08-05' },
      })
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit.mock.calls[0][0].weekEnd).toBe('2026-08-05')
    })

    it('pre-fills from an existing goal’s own weekEnd, not the +6 default', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2026-07-28',
            weekEnd: '2026-08-02',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(screen.getByLabelText('Ends on')).toHaveValue('2026-08-02')
    })
  })

  describe('editable start date (#671/#683)', () => {
    it('keeps the start date editable when editing the current goal in place (#683)', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 1,
            weekStart: '2026-07-28',
            weekEnd: '2026-08-02',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      const startInput = screen.getByLabelText('Starts on')
      expect(startInput).toHaveValue('2026-07-28')
      expect(startInput).not.toBeDisabled()
    })

    it('warns when a new goal window overlaps the previous one, without blocking save (#683)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-08-08T12:00:00'))
      const user = userEvent.setup({ delay: null })
      const onSubmit = vi.fn()
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 0.2,
            weekStart: '2026-08-04',
            weekEnd: '2026-08-10',
            createdAt: '2026-08-04T00:00:00.000Z',
            updatedAt: '2026-08-04T00:00:00.000Z',
          }}
          onSubmit={onSubmit}
          onDelete={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Start a new goal' }),
      )

      expect(
        screen.getByText(/This window overlaps a previous goal/),
      ).toBeInTheDocument()

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })

    it('prefills tomorrow when starting a new goal on a last-day reach (#671)', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-08-10T12:00:00'))
      const user = userEvent.setup({ delay: null })
      renderGoalForm(
        <GoalForm
          existingGoal={{
            id: 'g1',
            targetWeeklyLossKg: 0.2,
            weekStart: '2026-08-04',
            weekEnd: '2026-08-10',
            createdAt: '2026-08-04T00:00:00.000Z',
            updatedAt: '2026-08-04T00:00:00.000Z',
          }}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          activeGoalConcluded
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Start a new goal' }),
      )

      expect(screen.getByLabelText('Starts on')).toHaveValue('2026-08-11')
      expect(screen.getByLabelText('Starts on')).not.toBeDisabled()
      expect(screen.getByLabelText('Ends on')).toHaveValue('2026-08-17')
      vi.useRealTimers()
    })

    it('submits a custom start date and shifts the end default with it', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T12:00:00'))
      const user = userEvent.setup({ delay: null })
      const onSubmit = vi.fn()
      renderGoalForm(
        <GoalForm existingGoal={null} onSubmit={onSubmit} onDelete={vi.fn()} />,
      )

      fireEvent.change(screen.getByLabelText('Starts on'), {
        target: { value: '2026-07-26' },
      })
      expect(screen.getByLabelText('Ends on')).toHaveValue('2026-08-01')

      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '1',
      )
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )

      expect(onSubmit.mock.calls[0][0].weekStart).toBe('2026-07-26')
      expect(onSubmit.mock.calls[0][0].weekEnd).toBe('2026-08-01')
      vi.useRealTimers()
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
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

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

  // #529
  it('steps the weekly target by 0.1 kg with the ± buttons', async () => {
    const user = userEvent.setup()
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

    const input = screen.getByLabelText("This week's target (kg to lose)")
    await user.click(
      screen.getByRole('button', { name: 'Increase weekly target' }),
    )
    expect(input).toHaveValue('0.1')

    await user.click(
      screen.getByRole('button', { name: 'Increase weekly target' }),
    )
    expect(input).toHaveValue('0.2')

    await user.click(
      screen.getByRole('button', { name: 'Decrease weekly target' }),
    )
    expect(input).toHaveValue('0.1')
  })

  it('soft-warns above 1 kg/week without blocking save (#529)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderGoalForm(<GoalForm existingGoal={null} onSubmit={onSubmit}
      onDelete={vi.fn()} />)

    expect(
      screen.queryByRole('status'),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByLabelText("This week's target (kg to lose)"),
      '5',
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      /steep weekly pace/i,
    )
    expect(screen.getByRole('status')).toHaveTextContent('5,500')

    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].targetWeeklyLossKg).toBe(5)
  })

  describe('Cancel + confirm discard unsaved goal edits (#534)', () => {
    const existingGoal = {
      id: 'g1',
      targetWeeklyLossKg: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    it('shows a Cancel button next to Set / Update', () => {
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('returns to the summary without prompting when Cancel is clean', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={vi.fn()} />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      expect(
        screen.getByLabelText("This week's target (kg to lose)"),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(
        screen.queryByText('Leave without saving your goal changes?'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText("This week's target (kg to lose)"),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
    })

    it('asks before discarding dirty edits; No keeps the form', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={vi.fn()} />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await user.clear(
        screen.getByLabelText("This week's target (kg to lose)"),
      )
      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '2',
      )

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(
        screen.getByText('Leave without saving your goal changes?'),
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText("This week's target (kg to lose)"),
      ).toHaveValue('2')

      await user.click(screen.getByRole('button', { name: 'No' }))

      expect(
        screen.queryByText('Leave without saving your goal changes?'),
      ).not.toBeInTheDocument()
      expect(
        screen.getByLabelText("This week's target (kg to lose)"),
      ).toHaveValue('2')
    })

    it('discards dirty edits and returns to the summary on Yes', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={vi.fn()} />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await user.clear(
        screen.getByLabelText("This week's target (kg to lose)"),
      )
      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '2',
      )
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await user.click(screen.getByRole('button', { name: 'Yes' }))

      expect(
        screen.queryByLabelText("This week's target (kg to lose)"),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
    })

    it('blocks leaving the route when dirty and allows proceed on Yes', async () => {
      const user = userEvent.setup()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={vi.fn()} />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await user.clear(
        screen.getByLabelText("This week's target (kg to lose)"),
      )
      await user.type(
        screen.getByLabelText("This week's target (kg to lose)"),
        '2',
      )

      await user.click(screen.getByRole('link', { name: 'Leave goal' }))

      expect(
        screen.getByText('Leave without saving your goal changes?'),
      ).toBeInTheDocument()
      expect(screen.queryByText('other screen')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Yes' }))

      expect(screen.getByText('other screen')).toBeInTheDocument()
    })
  })

  describe('Delete goal (#668)', () => {
    const existingGoal = {
      id: 'g1',
      targetWeeklyLossKg: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    it('shows a Delete goal button next to Edit for an existing goal', () => {
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={vi.fn()} />,
      )

      expect(
        screen.getByRole('button', { name: 'Delete goal' }),
      ).toBeInTheDocument()
    })

    it('has no Delete goal button when there is no existing goal', () => {
      renderGoalForm(<GoalForm existingGoal={null} onSubmit={vi.fn()}
          onDelete={vi.fn()} />)

      expect(
        screen.queryByRole('button', { name: 'Delete goal' }),
      ).not.toBeInTheDocument()
    })

    it('asks for confirmation before deleting, and does nothing on Cancel', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={onDelete} />,
      )

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      expect(
        screen.getByText("Delete this goal? This can't be undone."),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onDelete).not.toHaveBeenCalled()
      expect(
        screen.queryByText("Delete this goal? This can't be undone."),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit goal' })).toBeInTheDocument()
    })

    it('deletes the goal on confirmation', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      renderGoalForm(
        <GoalForm existingGoal={existingGoal} onSubmit={vi.fn()}
          onDelete={onDelete} />,
      )

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('post-delete view-mode state (#674)', () => {
    const existingGoal = {
      id: 'g1',
      targetWeeklyLossKg: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    // Mirrors GoalScreen.tsx's real wiring: `onDelete` resolving is what
    // flips the store's (here, local) `goal` to `null` and re-renders
    // GoalForm with a null `existingGoal` prop, same as the live app.
    function DeletableGoalHarness() {
      const [goal, setGoal] = useState<typeof existingGoal | null>(
        existingGoal,
      )
      return (
        <GoalForm
          existingGoal={goal}
          onSubmit={vi.fn()}
          onDelete={() => setGoal(null)}
        />
      )
    }

    it('keeps showing the deleted goal in view mode instead of falling into an empty form', async () => {
      const user = userEvent.setup()
      renderGoalForm(<DeletableGoalHarness />)

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.getByText('1 kg/week')).toBeInTheDocument()
      expect(
        screen.queryByLabelText("This week's target (kg to lose)"),
      ).not.toBeInTheDocument()
    })

    it('hides the Delete button once the goal is already deleted', async () => {
      const user = userEvent.setup()
      renderGoalForm(<DeletableGoalHarness />)

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(
        screen.queryByRole('button', { name: 'Delete goal' }),
      ).not.toBeInTheDocument()
    })

    it('opens a blank form when Edit is tapped after a delete', async () => {
      const user = userEvent.setup()
      renderGoalForm(<DeletableGoalHarness />)

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      await user.click(screen.getByRole('button', { name: 'Edit goal' }))

      expect(
        screen.getByLabelText("This week's target (kg to lose)"),
      ).toHaveValue('')
      expect(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      ).toBeInTheDocument()
    })

    it('shows the previous goal after delete when the store promotes it (#677 stack)', async () => {
      const deleted = {
        id: 'g-deleted',
        targetWeeklyLossKg: 0.3,
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      }
      const previous = {
        id: 'g-previous',
        targetWeeklyLossKg: 0.2,
        weekStart: '2026-08-04',
        weekEnd: '2026-08-09',
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z',
      }

      function PromoteAfterDeleteHarness() {
        const [goal, setGoal] = useState<
          typeof deleted | typeof previous | null
        >(deleted)
        return (
          <GoalForm
            existingGoal={goal}
            onSubmit={vi.fn()}
            onDelete={async () => {
              // Stack pop: store promotes newest remaining (#677).
              setGoal(previous)
            }}
          />
        )
      }

      const user = userEvent.setup()
      renderGoalForm(<PromoteAfterDeleteHarness />)

      await user.click(screen.getByRole('button', { name: 'Delete goal' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.getByText('0.2 kg/week')).toBeInTheDocument()
      expect(screen.queryByText('0.3 kg/week')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Delete goal' }),
      ).toBeInTheDocument()
    })
  })
})
