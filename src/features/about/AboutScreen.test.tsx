import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { releaseNotes } from '@/data/releaseNotes'
import { storeVersions } from '@/data/storeVersions'
import { formatLocalizedDate, useLocaleStore } from '@/i18n'
import { AboutScreen } from './AboutScreen'

const isNativePlatform = vi.fn(() => false)
const getInfo = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: () => getInfo(),
  },
}))

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  isNativePlatform.mockReturnValue(false)
  getInfo.mockReset()
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
      screen.queryByText('What this app is, and why it exists'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/private, local-first companion/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/meals, macros, hydration, sleep, activity/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Optional LDL tags stay off until you turn them on/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /steady progress through small, consistent steps/,
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

  it('leads with Features, Privacy, and version cards (#498, #1130)', () => {
    renderAboutScreen()

    const featuresHeading = screen.getByRole('heading', { name: 'Features' })
    const privacyHeading = screen.getByRole('heading', {
      name: 'Privacy Policy',
    })
    const appVersionHeading = screen.getByRole('heading', {
      name: 'App version',
    })
    const storeHeading = screen.getByRole('heading', {
      name: 'App Store versions',
    })
    const notesHeading = screen.getByRole('heading', {
      name: /^Release notes · Internal counter \d+$/,
    })
    const aboutBody = screen.getByText(/private, local-first companion/)

    expect(featuresHeading.compareDocumentPosition(privacyHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(privacyHeading.compareDocumentPosition(appVersionHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(appVersionHeading.compareDocumentPosition(storeHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(storeHeading.compareDocumentPosition(notesHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(notesHeading.compareDocumentPosition(aboutBody)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('says this is the web version when there is no native bundle (#1130)', () => {
    renderAboutScreen()

    expect(screen.getByText('This is the web version.')).toBeInTheDocument()
    expect(getInfo).not.toHaveBeenCalled()
  })

  it('shows the native version and build from the installed bundle (#1130)', async () => {
    isNativePlatform.mockReturnValue(true)
    getInfo.mockResolvedValue({
      name: 'Turtle Steps',
      id: 'io.github.zhannam85.turtlesteps',
      version: '1.0.2',
      build: '29',
    })
    renderAboutScreen()

    expect(await screen.findByText('1.0.2 (build 29)')).toBeInTheDocument()
    expect(screen.queryByText('This is the web version.')).not.toBeInTheDocument()
  })

  it('does not invent a version when the native read fails (#1130)', async () => {
    isNativePlatform.mockReturnValue(true)
    getInfo.mockRejectedValue(new Error('unavailable'))
    renderAboutScreen()

    expect(
      await screen.findByText('App version unavailable.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/1\.0/)).not.toBeInTheDocument()
  })

  it('keeps the release-notes number labeled as an internal counter (#1130)', () => {
    renderAboutScreen()

    expect(
      screen.getByRole('heading', {
        name: /^Release notes · Internal counter \d+$/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /^Release notes · Version \d+$/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show release notes' }),
    ).toBeInTheDocument()
  })

  it('expands App Store versions separately from release notes (#1130)', async () => {
    const user = userEvent.setup()
    renderAboutScreen()

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(storeVersions[0].en)).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Show App Store versions' }),
    )

    expect(
      screen.getByRole('button', { name: 'Hide App Store versions' }),
    ).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(storeVersions[0].version)
    expect(items[0]).toHaveTextContent(
      formatLocalizedDate(storeVersions[0].date, 'en'),
    )
    expect(screen.queryByText(releaseNotes[0].en)).not.toBeInTheDocument()
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
    expect(
      screen.queryByText('Что это за приложение и зачем оно нужно'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Автор: ZhannaM85')).toBeInTheDocument()
    expect(
      screen.getByText(/Метки ЛПНП остаются выключенными/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Версия приложения' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Это веб-версия.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /^История изменений · Внутренний счётчик \d+$/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Версии App Store' }),
    ).toBeInTheDocument()
  })
})
