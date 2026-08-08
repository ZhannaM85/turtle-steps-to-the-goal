import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { releaseNotes } from '@/data/releaseNotes'
import { useLocaleStore } from '@/i18n'
import { ReleaseNotesSection } from './ReleaseNotesSection'

describe('ReleaseNotesSection', () => {
  it('shows entries, most-recent-first', () => {
    render(<ReleaseNotesSection />)

    // Asserted against the data itself, not a hardcoded string — this list
    // grows every time an issue closes (see CLAUDE.md), so pinning to a
    // specific entry's text here would go stale on the very next one.
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(releaseNotes[0].en)
    expect(items.at(-1)).toHaveTextContent(
      releaseNotes[releaseNotes.length - 1].en,
    )
  })

  it('shows the commit time alongside the date, not just the day', () => {
    render(<ReleaseNotesSection />)

    const items = screen.getAllByRole('listitem')
    const firstTimestamp = items[0].querySelector('span')?.textContent ?? ''
    // 'PPp' includes a localized time (e.g. "4:09 PM"), so the rendered
    // string should contain a colon-separated time, not just a bare date.
    expect(firstTimestamp).toMatch(/\d{1,2}:\d{2}/)
  })

  it('shows each entry\'s version number alongside its timestamp', () => {
    render(<ReleaseNotesSection />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(`v${releaseNotes[0].version}`)
  })

  it('shows Russian entries when the locale is Russian', () => {
    useLocaleStore.setState({ locale: 'ru' })
    render(<ReleaseNotesSection />)

    expect(screen.getByText('Начальная настройка проекта.')).toBeInTheDocument()

    useLocaleStore.setState({ locale: 'en' })
  })
})
