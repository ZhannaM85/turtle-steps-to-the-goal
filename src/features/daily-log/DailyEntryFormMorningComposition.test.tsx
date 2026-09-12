/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectBodyCompositionValues,
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('body composition (#233)', () => {
    it('saves muscle mass/visceral fat/body water/bone mass together via one Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Muscle mass (kg)'), '30')
      await user.type(screen.getByLabelText('Visceral fat'), '5')
      await user.type(screen.getByLabelText('Body water (%)'), '48')
      await user.type(screen.getByLabelText('Bone mass (kg)'), '2.3')
      await user.type(screen.getByLabelText('Body fat (%)'), '22')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(30)
      expect(onSave.mock.calls[0][0].visceralFatRating).toBe(5)
      expect(onSave.mock.calls[0][0].bodyWaterPercent).toBe(48)
      expect(onSave.mock.calls[0][0].boneMassKg).toBe(2.3)
      expect(onSave.mock.calls[0][0].bodyFatPercent).toBe(22)
      expectBodyCompositionValues(['30kg', '5', '48%', '2.3kg', '22%'])
    })

    it('rejects an empty Save and does not persist dashes (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Save body composition' }),
      ).toBeInTheDocument()
    })

    it('rejects a typed 0 and does not save (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Muscle mass (kg)'), '0')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('rejects Save after body composition fields are typed then cleared (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const muscle = screen.getByLabelText('Muscle mass (kg)')
      await user.type(muscle, '30')
      await user.clear(muscle)
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('saves body composition with only some fields filled (#753)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Muscle mass (kg)'), '30')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(30)
      expect(onSave.mock.calls[0][0].visceralFatRating).toBeUndefined()
      expect(onSave.mock.calls[0][0].bodyFatPercent).toBeUndefined()
    })

    it('puts screenshot, edit, and delete on the title row so the grid is full width (#750)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            muscleMassKg: 37.61,
            visceralFatRating: 5,
            bodyWaterPercent: 48,
            boneMassKg: 2.33,
            bodyFatPercent: 32.7,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const titleRow = screen.getByText('Body composition').closest(
        'div',
      ) as HTMLElement
      expect(
        within(titleRow).getByRole('button', {
          name: 'Fill from Zepp screenshot',
        }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).getByRole('button', {
          name: 'Edit body composition',
        }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).getByRole('button', {
          name: 'Delete body composition',
        }),
      ).toBeInTheDocument()
      expect(within(titleRow).queryByText('37.61kg')).not.toBeInTheDocument()
      expectBodyCompositionValues([
        '37.61kg',
        '5',
        '48%',
        '2.33kg',
        '32.7%',
      ])
    })

    it('rejects an out-of-range visceral fat value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Visceral fat'), '999')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    describe('validates on blur, not just on Save (#435)', () => {
      it('shows an error as soon as an out-of-range value is blurred, before Save is clicked', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        await user.type(screen.getByLabelText('Muscle mass (kg)'), '27272')
        await user.tab()

        expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      })

      it('clears the error on blur once the value is fixed', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        const field = screen.getByLabelText('Visceral fat')
        await user.type(field, '19119')
        await user.tab()
        expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()

        await user.clear(field)
        await user.type(field, '5')
        await user.tab()

        expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      })

      it('does not show an error while a value is only half-typed, before blurring', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        // "2" alone would be a perfectly valid visceral fat rating -- this
        // confirms validation isn't running on every keystroke.
        await user.type(screen.getByLabelText('Visceral fat'), '2')

        expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      })

      it('treats a blurred 0 as invalid (#753)', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        await user.type(screen.getByLabelText('Muscle mass (kg)'), '0')
        await user.tab()

        expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      })

      it('does not treat a blurred empty field as invalid (#753)', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        await user.click(screen.getByLabelText('Muscle mass (kg)'))
        await user.tab()

        expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      })
    })

    it('puts Save on the title row so the grid is full width (#858)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      const titleRow = screen.getByText('Body composition').closest(
        'div',
      ) as HTMLElement
      const saveButton = within(titleRow).getByRole('button', {
        name: 'Save body composition',
      })
      expect(saveButton).toHaveAttribute('data-size', 'icon-sm')
      expect(saveButton).not.toHaveClass(
        'col-start-3',
        'row-start-2',
        'self-end',
      )
    })

    it('shows existing body composition as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            muscleMassKg: 30,
            visceralFatRating: 5,
            bodyWaterPercent: 48,
            boneMassKg: 2.3,
            bodyFatPercent: 22,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expectBodyCompositionValues(['30kg', '5', '48%', '2.3kg', '22%'])
      expect(
        screen.queryByRole('button', { name: 'Save body composition' }),
      ).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Edit body composition' }),
      )
      const muscleInput = screen.getByLabelText('Muscle mass (kg)')
      expect(muscleInput).toHaveValue('30')
      await user.clear(muscleInput)
      await user.type(muscleInput, '31')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(31)
      expectBodyCompositionValues(['31kg', '5', '48%', '2.3kg', '22%'])
    })
  })
})
