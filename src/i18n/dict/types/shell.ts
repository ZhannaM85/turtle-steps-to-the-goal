export interface CommonDict {
    loading: string
    kg: string
    lb: string
    /** The goal's own anchored 7-day window (#135) — just the date range,
     * no week number: the window starts whenever the target was last
     * saved, not a fixed calendar grid, so a running "Week N" count no
     * longer corresponds to anything meaningful here. */
    weekRangeLabel: (start: string, end: string) => string
    /** #232 — generic show/hide labels for a dismissible Today/Goal
     * section, same shape as `dashboard.hideChartLabel`/`showChartLabel`
     * but not Dashboard-specific, so it lives here instead. */
    hideSectionLabel: (title: string) => string
    showSectionLabel: (title: string) => string
  }

export interface ErrorDict {
    title: string
    description: string
    reloadButton: string
  }

export interface UpdateDict {
    availableText: string
    reloadButton: string
    reloadingText: string
  }

export interface OfflineDict {
    offlineText: string
  }

export interface NavDict {
    appName: string
    today: string
    dashboard: string
    history: string
    goal: string
    settings: string
    about: string
  }
