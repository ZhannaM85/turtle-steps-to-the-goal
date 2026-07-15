import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import { ReleaseNotesSection } from './ReleaseNotesSection'

describe('ReleaseNotesSection', () => {
  it('is collapsed by default', () => {
    render(<ReleaseNotesSection />)

    expect(
      screen.getByRole('button', { name: 'Show release notes' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Initial project setup.')).not.toBeInTheDocument()
  })

  it('expands to show entries, most-recent-first', async () => {
    const user = userEvent.setup()
    render(<ReleaseNotesSection />)

    await user.click(
      screen.getByRole('button', { name: 'Show release notes' }),
    )

    expect(
      screen.getByRole('button', { name: 'Hide release notes' }),
    ).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(
      'Meal reactions now use thumbs up/down',
    )
    expect(items.at(-1)).toHaveTextContent('Initial project setup.')
  })

  it('shows Russian entries when the locale is Russian', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const user = userEvent.setup()
    render(<ReleaseNotesSection />)

    await user.click(
      screen.getByRole('button', { name: 'Показать историю изменений' }),
    )

    expect(
      screen.getByText('Начальная настройка проекта.'),
    ).toBeInTheDocument()

    useLocaleStore.setState({ locale: 'en' })
  })
})
