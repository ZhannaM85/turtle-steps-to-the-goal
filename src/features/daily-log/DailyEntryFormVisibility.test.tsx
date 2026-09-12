/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  useDigestionTrackingStore,
  useTrackedFieldsStore,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import { render } from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('optional field visibility (#237)', () => {
    afterEach(() => {
      // Merges onto whatever keys exist rather than a full literal
      // (#233's own lesson from the Dashboard/Today stores) — stays
      // correct as TrackedField grows.
      useTrackedFieldsStore.setState((state) => ({
        tracked: Object.fromEntries(
          Object.keys(state.tracked).map((key) => [key, true]),
        ) as typeof state.tracked,
      }))
    })

    it('shows Sleep, Steps, Body measurements, Note, and Mood by default; Body composition and Morning note are opt-in (#528, #763)', () => {
      useTrackedFieldsStore.setState({
        tracked: {
          sleep: true,
          steps: true,
          bodyMeasurements: true,
          note: true,
          morningNote: false,
          mood: true,
          bodyComposition: false,
          nightEating: true,
          dayTotals: true,
          fiber: true,
          zeppScreenshot: true,
          autoSleepScreenshot: true,
        },
      })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText('Sleep')).toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
      expect(screen.getByText('Body measurements')).toBeInTheDocument()
      expect(screen.queryByText('Body composition')).not.toBeInTheDocument()
      expect(screen.queryByText('Morning note')).not.toBeInTheDocument()
      expect(screen.getByText("Day's note")).toBeInTheDocument()
      expect(screen.getByText('Mood today')).toBeInTheDocument()
      expect(screen.getByText('Day totals')).toBeInTheDocument()
    })

    it('hides Day totals when its Settings toggle is off (#575)', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, dayTotals: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Day totals')).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText('Day total calories'),
      ).not.toBeInTheDocument()
    })

    it('hides night eating when its Settings toggle is off (#532)', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, nightEating: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Ate late tonight')).not.toBeInTheDocument()
      expect(screen.queryByText('Night food')).not.toBeInTheDocument()
    })

    it('hides the whole Evening section when every evening field is off (#532)', () => {
      useDigestionTrackingStore.setState({ enabled: false })
      useTrackedFieldsStore.setState((state) => ({
        tracked: {
          ...state.tracked,
          steps: false,
          note: false,
          mood: false,
          nightEating: false,
        },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Evening entries')).not.toBeInTheDocument()
    })

    it('shows Morning note once its Settings toggle is turned on (#763)', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, morningNote: true },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText('Morning note')).toBeInTheDocument()
    })

    it('hides Morning note once its Settings toggle is turned off (#763)', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, morningNote: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Morning note')).not.toBeInTheDocument()
    })

    it('shows Body composition once its Settings toggle is turned on (#528)', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, bodyComposition: true },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText('Body composition')).toBeInTheDocument()
    })

    it('hides Body composition once its Settings toggle is turned off', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, bodyComposition: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Body composition')).not.toBeInTheDocument()
      expect(screen.getByText('Body measurements')).toBeInTheDocument()
    })

    it('hides a field once its Settings toggle is turned off, without affecting the others', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, sleep: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Sleep')).not.toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
    })

    it('hides Mood independently of Note', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, mood: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText("Day's note")).toBeInTheDocument()
      expect(screen.queryByText('Mood today')).not.toBeInTheDocument()
    })

    it('hides Note independently of Mood, which stays interactive on its own', async () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, note: false },
      }))
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      expect(screen.queryByText("Day's note")).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Happy — Mood today' }),
      )
      expect(onSave.mock.calls[0][0].emotion).toBe('happy')
    })
  })

})
