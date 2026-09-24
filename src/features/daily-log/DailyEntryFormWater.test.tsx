/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  useWaterTrackingStore,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('water tracking (#258)', () => {
    it('hides the field when water tracking is disabled', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.queryByRole('button', { name: '+1 glass (250ml)' }),
      ).not.toBeInTheDocument()
    })

    // #598: freeform ml input removed — glass/bottle quick-add only.
    it('shows quick-add buttons when enabled (no freeform ml input)', () => {
      useWaterTrackingStore.setState({ enabled: true })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.getByRole('button', { name: '+1 glass (250ml)' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '+1 bottle (500ml)' }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Water amount')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Add water' }),
      ).not.toBeInTheDocument()
    })

    it('adds a new entry immediately on a quick-add click, with no prior entries', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.click(screen.getByRole('button', { name: '+1 glass (250ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      const saved = onSave.mock.calls[0][0].waterEntries[0]
      expect(saved).toEqual(
        expect.objectContaining({
          amountMl: 250,
          timeDrunk: expect.stringMatching(/^\d{2}:\d{2}$/),
        }),
      )
      expect(screen.getByText(`250ml · ${saved.timeDrunk}`)).toBeInTheDocument()
    })

    it('adds to already-logged entries rather than replacing them', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [{ id: 'w1', amountMl: 500 }],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('500ml')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '+1 bottle (500ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterEntries).toEqual([
        expect.objectContaining({ id: 'w1', amountMl: 500 }),
        expect.objectContaining({
          amountMl: 500,
          timeDrunk: expect.stringMatching(/^\d{2}:\d{2}$/),
        }),
      ])
      expect(screen.getByText('500ml')).toBeInTheDocument()
      expect(
        screen.getByText(
          `500ml · ${onSave.mock.calls[0][0].waterEntries[1].timeDrunk}`,
        ),
      ).toBeInTheDocument()
    })

    it('removes a logged entry via its own remove button', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [
              { id: 'w1', amountMl: 250 },
              { id: 'w2', amountMl: 500 },
            ],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Remove 250ml entry' }),
      )
      expect(screen.getByText('Delete this water entry?')).toBeInTheDocument()
      // #889 — confirm sits above the list; other chips stay mounted.
      expect(screen.getByText('250ml')).toBeInTheDocument()
      expect(screen.getByText('500ml')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText('250ml')).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Remove 250ml entry' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterEntries).toEqual([
        expect.objectContaining({ id: 'w2', amountMl: 500 }),
      ])
      expect(screen.queryByText('250ml')).not.toBeInTheDocument()
      expect(screen.getByText('500ml')).toBeInTheDocument()
    })

    it('stamps the current time on a quick-add and shows it on the chip (#849)', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.click(screen.getByRole('button', { name: '+1 bottle (500ml)' }))

      const saved = onSave.mock.calls[0][0].waterEntries[0]
      expect(saved.timeDrunk).toMatch(/^\d{2}:\d{2}$/)
      expect(screen.getByText(`500ml · ${saved.timeDrunk}`)).toBeInTheDocument()
    })

    it('opens an edit dialog from a chip tap and saves a new time (#849)', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [{ id: 'w1', amountMl: 500 }],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit 500ml entry' }))
      expect(screen.getByRole('heading', { name: 'Edit water' })).toBeInTheDocument()
      // #856 — both controls are the same full-width box; мл is overlayed
      // inside Amount; Time resets Safari's intrinsic time-input width.
      // #857 — Time also flex-centers the value (Safari type=time sits high).
      const dialog = screen.getByRole('dialog')
      expect(screen.getByLabelText('Amount')).toHaveClass(
        'h-12',
        'w-full',
        'min-w-0',
        'max-w-full',
      )
      expect(screen.getByLabelText('Time')).toHaveClass(
        'h-12',
        'w-full',
        'min-w-0',
        'max-w-full',
        'appearance-none',
        'flex',
        'items-center',
        'leading-normal',
      )
      expect(within(dialog).getByText('ml')).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Time'), {
        target: { value: '07:30' },
      })
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }),
      )

      expect(onSave.mock.calls.at(-1)?.[0].waterEntries).toEqual([
        expect.objectContaining({ id: 'w1', amountMl: 500, timeDrunk: '07:30' }),
      ])
      expect(screen.getByText('500ml · 07:30')).toBeInTheDocument()
    })

    it('shows water chips in clock order and keeps that order after edit and delete (#985)', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-09-24"
          existingEntry={{
            id: 'entry-1',
            date: '2026-09-24',
            waterEntries: [
              { id: 'w-1102', amountMl: 500, timeDrunk: '11:33' },
              { id: 'w-0802', amountMl: 500, timeDrunk: '08:02' },
              { id: 'w-1033', amountMl: 500, timeDrunk: '10:33' },
            ],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      const section = document.getElementById('water-entry-section')
      expect(section).not.toBeNull()
      const water = within(section as HTMLElement)
      const chipTimes = () =>
        water
          .getAllByRole('button', { name: /^Edit / })
          .map((button) => button.textContent)
      const editChip = (time: string) => {
        const button = water
          .getAllByRole('button', { name: /^Edit / })
          .find((item) => item.textContent?.includes(time))
        if (!button) throw new Error(`missing chip ${time}`)
        return button
      }

      expect(chipTimes()).toEqual([
        '500ml · 08:02',
        '500ml · 10:33',
        '500ml · 11:33',
      ])

      await user.click(editChip('08:02'))
      fireEvent.change(screen.getByLabelText('Time'), {
        target: { value: '12:15' },
      })
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }),
      )

      expect(chipTimes()).toEqual([
        '500ml · 10:33',
        '500ml · 11:33',
        '500ml · 12:15',
      ])
      expect(onSave.mock.calls.at(-1)?.[0].waterEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'w-0802',
            amountMl: 500,
            timeDrunk: '12:15',
          }),
        ]),
      )

      const tenThirtyThree = editChip('10:33')
      const remove = tenThirtyThree.parentElement
      if (!remove) throw new Error('missing chip shell')
      await user.click(
        within(remove).getByRole('button', { name: 'Remove 500ml entry' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(chipTimes()).toEqual(['500ml · 11:33', '500ml · 12:15'])
    })

    it('does not open the edit dialog when the remove button is clicked (#849)', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [{ id: 'w1', amountMl: 250, timeDrunk: '10:15' }],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Remove 250ml entry' }),
      )

      expect(screen.getByText('Delete this water entry?')).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Edit water' }),
      ).not.toBeInTheDocument()
    })
  })

})
