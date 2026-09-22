import type { CommonDict, ErrorDict, UpdateDict, OfflineDict, NavDict } from '../types/shell'

export const common: CommonDict = {
    loading: 'Loading…',
    kg: 'kg',
    lb: 'lb',
    weekRangeLabel: (start, end) => `${start} – ${end}`,
    hideSectionLabel: (title) => `Hide ${title}`,
    showSectionLabel: (title) => `Show ${title}`,
  }

export const error: ErrorDict = {
    title: 'Something went wrong',
    description:
      "The app hit an unexpected error. Your data is safe — it's all stored on this device. Reloading usually fixes it.",
    reloadButton: 'Reload',
  }

export const update: UpdateDict = {
    availableText: 'A new version is available.',
    reloadButton: 'Reload',
    reloadingText: 'Reloading…',
  }

export const offline: OfflineDict = {
    offlineText: "You're offline — your data is still saved on this device.",
  }

export const nav: NavDict = {
    appName: 'Turtle Steps to the Goal',
    scrollToTop: 'Scroll to top',
    today: 'Day',
    dashboard: 'Dashboard',
    history: 'History',
    goal: 'Goal',
    settings: 'Settings',
    about: 'About',
  }
