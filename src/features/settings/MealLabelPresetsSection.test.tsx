import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { useMealLabelPresetStore } from '@/stores'
import { MealLabelPresetsSection } from './MealLabelPresetsSection'

beforeEach(() => {
  useMealLabelPresetStore.setState({ presets: [] })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

describe('MealLabelPresetsSection', () => {
  it('shows an empty state with no presets yet', () => {
    render(<MealLabelPresetsSection />)

    expect(
      screen.getByText('No presets yet — add one below.'),
    ).toBeInTheDocument()
  })

  it('lists existing presets', () => {
    useMealLabelPresetStore.setState({ presets: ['Breakfast', 'Lunch'] })
    render(<MealLabelPresetsSection />)

    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
  })

  it('adds a new preset via the input and button', async () => {
    const user = userEvent.setup()
    render(<MealLabelPresetsSection />)

    await user.type(screen.getByLabelText('Add a preset'), 'Second breakfast')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Second breakfast')).toBeInTheDocument()
    expect(useMealLabelPresetStore.getState().presets).toEqual([
      'Second breakfast',
    ])
  })

  it('adds a new preset on Enter', async () => {
    const user = userEvent.setup()
    render(<MealLabelPresetsSection />)

    await user.type(screen.getByLabelText('Add a preset'), 'Snack{Enter}')

    expect(screen.getByText('Snack')).toBeInTheDocument()
  })

  it('deletes a preset', async () => {
    useMealLabelPresetStore.setState({ presets: ['Breakfast'] })
    const user = userEvent.setup()
    render(<MealLabelPresetsSection />)

    await user.click(screen.getByRole('button', { name: 'Delete "Breakfast"' }))

    expect(screen.queryByText('Breakfast')).not.toBeInTheDocument()
    expect(useMealLabelPresetStore.getState().presets).toEqual([])
  })

  it('offers built-in defaults as one-click adds', async () => {
    const user = userEvent.setup()
    render(<MealLabelPresetsSection />)

    const addBreakfast = screen.getByRole('button', {
      name: 'Add "Breakfast"',
    })
    await user.click(addBreakfast)

    expect(useMealLabelPresetStore.getState().presets).toContain('Breakfast')
    expect(
      screen.queryByRole('button', { name: 'Add "Breakfast"' }),
    ).not.toBeInTheDocument()
  })

  it('does not suggest a default already added in another language (#142)', () => {
    useMealLabelPresetStore.setState({ presets: ['Breakfast'] })
    useLocaleStore.setState({ locale: 'ru' })
    render(<MealLabelPresetsSection />)

    expect(
      screen.queryByRole('button', { name: 'Добавить «Завтрак»' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Добавить «Обед»' }),
    ).toBeInTheDocument()
  })
})
