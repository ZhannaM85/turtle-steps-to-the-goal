/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('night eating tracking (#383)', () => {
    it('saves No-path easy immediately (#835)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const nightFood = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      await user.click(nightFood.getByRole('radio', { name: 'No' }))
      const easy = within(
        screen.getByRole('radiogroup', { name: 'Was it easy?' }),
      )
      await user.click(easy.getByRole('radio', { name: 'Yes' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingNoEasy).toBe(true)
    })

    it('saves No-path what helped on check without migrating thoughts (#842)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            nightEatingNoThoughts: 'old thoughts',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.queryByText('old thoughts')).not.toBeInTheDocument()
      await user.type(
        screen.getByRole('textbox', { name: 'What helped?' }),
        'tea helped',
      )
      await user.click(screen.getByRole('button', { name: 'Save what helped' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingNoWhatHelped).toBe(
        'tea helped',
      )
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingNoThoughts).toBe(
        'old thoughts',
      )
    })

    it('saves remember how I ate immediately (#818)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const nightFood = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      await user.click(nightFood.getByRole('radio', { name: 'Yes' }))
      const remember = within(
        screen.getByRole('radiogroup', { name: 'I remember how I ate' }),
      )
      await user.click(remember.getByRole('radio', { name: 'Partially' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingRemember).toBe('partial')
    })

    it('saves night food reason on check (#818)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const nightFood = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      await user.click(nightFood.getByRole('radio', { name: 'Yes' }))
      await user.type(
        screen.getByRole('textbox', { name: 'Reason' }),
        'could not sleep',
      )
      await user.click(screen.getByRole('button', { name: 'Save reason' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingReason).toBe(
        'could not sleep',
      )
    })

    it('does not save an empty night food reason (#854)', async () => {
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByRole('button', { name: 'Save reason' })).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('does not save an empty What helped (#854)', async () => {
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Save what helped' }),
      ).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('puts What helped save and clear on the title row (#850 / #858)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const titleRow = screen.getByText('What helped?').closest(
        'div',
      ) as HTMLElement
      const save = within(titleRow).getByRole('button', {
        name: 'Save what helped',
      })
      const clear = within(titleRow).getByRole('button', {
        name: 'Cancel editing what helped',
      })
      expect(save).toHaveAttribute('data-size', 'icon-sm')
      expect(clear).toHaveAttribute('data-size', 'icon-sm')
      expect(
        titleRow.contains(screen.getByRole('textbox', { name: 'What helped?' })),
      ).toBe(false)
    })

    it('puts Night food reason save and clear on the title row (#850 / #858)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const titleRow = screen.getByText('Reason').closest('div') as HTMLElement
      const save = within(titleRow).getByRole('button', {
        name: 'Save reason',
      })
      const clear = within(titleRow).getByRole('button', {
        name: 'Cancel editing reason',
      })
      expect(save).toHaveAttribute('data-size', 'icon-sm')
      expect(clear).toHaveAttribute('data-size', 'icon-sm')
    })

    it('clears an unsaved What helped draft without persisting it (#850)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      const input = screen.getByRole('textbox', { name: 'What helped?' })
      await user.type(input, 'tea helped')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing what helped' }),
      )

      expect(onSave).not.toHaveBeenCalled()
      expect(input).toHaveValue('')
      expect(
        screen.getByRole('textbox', { name: 'What helped?' }),
      ).toBeInTheDocument()
    })

    it('reverts What helped to the value saved this session (#850)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.type(
        screen.getByRole('textbox', { name: 'What helped?' }),
        'tea helped',
      )
      await user.click(screen.getByRole('button', { name: 'Save what helped' }))
      await user.click(screen.getByRole('button', { name: 'Edit what helped' }))
      const input = screen.getByRole('textbox', { name: 'What helped?' })
      await user.clear(input)
      await user.type(input, 'changed my mind')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing what helped' }),
      )

      expect(screen.getByText('tea helped')).toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'What helped?' }),
      ).not.toBeInTheDocument()
    })

    it('deletes a saved What helped after confirm (#855)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            nightEatingNoWhatHelped: 'tea helped',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Delete what helped' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls.at(-1)?.[0].nightEatingNoWhatHelped).toBeUndefined()
      expect(screen.getByRole('textbox', { name: 'What helped?' })).toHaveValue(
        '',
      )
    })

  })
})
