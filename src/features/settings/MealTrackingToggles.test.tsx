import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTrackedFieldsStore } from '@/stores'
import { useLocaleStore } from '@/i18n'
import { SettingsTrackedFieldsSection } from './SettingsTrackedFieldsSection'

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useTrackedFieldsStore.setState(state => ({
    tracked: { ...state.tracked, mealNotes: false, mealReactions: false },
  }))
})

describe('optional meal fields (#1071)', () => {
  it('defaults both fields off and independently enables them in Settings', async () => {
    expect(useTrackedFieldsStore.getInitialState().tracked.mealNotes).toBe(false)
    expect(useTrackedFieldsStore.getInitialState().tracked.mealReactions).toBe(false)
    const user = userEvent.setup()
    render(<SettingsTrackedFieldsSection />)
    const notes = screen.getByRole('switch', { name: 'Meal notes' })
    const reactions = screen.getByRole('switch', { name: 'Meal and food reactions' })
    expect(notes).not.toBeChecked()
    expect(reactions).not.toBeChecked()
    await user.click(notes)
    expect(notes).toBeChecked()
    expect(reactions).not.toBeChecked()
    await user.click(reactions)
    expect(reactions).toBeChecked()
    await user.click(notes)
    expect(useTrackedFieldsStore.getState().tracked.mealNotes).toBe(false)
    expect(useTrackedFieldsStore.getState().tracked.mealReactions).toBe(true)
  })

  it('shows Russian labels', () => {
    useLocaleStore.setState({ locale: 'ru' })
    render(<SettingsTrackedFieldsSection />)
    expect(screen.getByRole('switch', { name: 'Заметки к приёмам пищи' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Реакции на приёмы пищи и блюда' })).not.toBeChecked()
  })
})
