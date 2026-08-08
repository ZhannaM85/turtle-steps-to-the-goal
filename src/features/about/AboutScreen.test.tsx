import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { releaseNotes } from '@/data/releaseNotes'
import { useLocaleStore } from '@/i18n'
import { AboutScreen } from './AboutScreen'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  useLocaleStore.setState({ locale: 'en' })
})

function renderAboutScreen() {
  render(
    <MemoryRouter>
      <AboutScreen />
    </MemoryRouter>,
  )
}

describe('AboutScreen', () => {
  it('summarizes the current app and its no-big-goal philosophy (#213, #495)', () => {
    renderAboutScreen()

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(
      screen.getByText(/private, local-first companion/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/meals, macros, hydration, sleep, activity/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /steady weekly progress through small, consistent steps/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Private by design.')).toBeInTheDocument()
    expect(
      screen.getByText(/stored locally on your device/),
    ).toBeInTheDocument()
  })

  it('credits the author with a link to their GitHub profile', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', { name: 'Made by ZhannaM85' })
    expect(link).toHaveAttribute('href', 'https://github.com/ZhannaM85')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links to the full privacy policy page (#312)', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', {
      name: 'Read the full privacy policy',
    })
    expect(link).toHaveAttribute('href', '/privacy')
  })

  it('links to the features overview page (#346)', () => {
    renderAboutScreen()

    const link = screen.getByRole('link', {
      name: 'See everything the app can do',
    })
    expect(link).toHaveAttribute('href', '/features')
  })

  it('leads with Features, Privacy, and Version as cards (#498)', () => {
    renderAboutScreen()

    const featuresHeading = screen.getByRole('heading', { name: 'Features' })
    const privacyHeading = screen.getByRole('heading', {
      name: 'Privacy Policy',
    })
    const versionHeading = screen.getByRole('heading', { name: /Version \d+$/ })
    const aboutBody = screen.getByText(/private, local-first companion/)

    expect(featuresHeading.compareDocumentPosition(privacyHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(privacyHeading.compareDocumentPosition(versionHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(versionHeading.compareDocumentPosition(aboutBody)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('shows the current version number', () => {
    renderAboutScreen()

    expect(
      screen.getByRole('heading', { name: /Version \d+$/ }),
    ).toBeInTheDocument()
  })

  it('combines release notes and the version number in one card heading (#655)', () => {
    renderAboutScreen()

    expect(
      screen.getByRole('heading', { name: /^Release notes · Version \d+$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show release notes' }),
    ).toBeInTheDocument()
  })

  it('expands release notes via the icon toggle next to the version, no separate text button (#655)', async () => {
    const user = userEvent.setup()
    renderAboutScreen()

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    // Icon-only toggle: an accessible name via aria-label, but no visible
    // "Show release notes" text node in the document.
    expect(screen.queryByText('Show release notes')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show release notes' }))

    expect(
      screen.getByRole('button', { name: 'Hide release notes' }),
    ).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(releaseNotes[0].en)
  })

  it('renders in Russian when the locale is switched', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderAboutScreen()

    expect(
      screen.getByRole('heading', { name: 'О приложении' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Автор: ZhannaM85')).toBeInTheDocument()
  })
})
