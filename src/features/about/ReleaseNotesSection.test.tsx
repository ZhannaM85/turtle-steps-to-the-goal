import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { releaseNotes } from '@/data/releaseNotes'
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

    await user.click(screen.getByRole('button', { name: 'Show release notes' }))

    expect(
      screen.getByRole('button', { name: 'Hide release notes' }),
    ).toBeInTheDocument()
    // Asserted against the data itself, not a hardcoded string — this list
    // grows every time an issue closes (see CLAUDE.md), so pinning to a
    // specific entry's text here would go stale on the very next one.
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(releaseNotes[0].en)
    expect(items.at(-1)).toHaveTextContent(
      releaseNotes[releaseNotes.length - 1].en,
    )
  })

  it('shows the commit time alongside the date, not just the day', async () => {
    const user = userEvent.setup()
    render(<ReleaseNotesSection />)

    await user.click(screen.getByRole('button', { name: 'Show release notes' }))

    const items = screen.getAllByRole('listitem')
    const firstTimestamp = items[0].querySelector('span')?.textContent ?? ''
    // 'PPp' includes a localized time (e.g. "4:09 PM"), so the rendered
    // string should contain a colon-separated time, not just a bare date.
    expect(firstTimestamp).toMatch(/\d{1,2}:\d{2}/)
  })

  it('shows Russian entries when the locale is Russian', async () => {
    useLocaleStore.setState({ locale: 'ru' })
    const user = userEvent.setup()
    render(<ReleaseNotesSection />)

    await user.click(
      screen.getByRole('button', { name: 'Показать историю изменений' }),
    )

    expect(screen.getByText('Начальная настройка проекта.')).toBeInTheDocument()

    useLocaleStore.setState({ locale: 'en' })
  })
})
