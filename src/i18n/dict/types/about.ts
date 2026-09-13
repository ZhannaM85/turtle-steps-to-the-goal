export interface AboutDict {
    title: string
    description: string
    intro: string
    /** #213 rewrite: why the app tracks more than just weight/calories. */
    tracking: string
    philosophy: string
    /** #213 rewrite: a short standalone heading right before `privacy`,
     * not part of that paragraph's own sentence flow. */
    privacyHeading: string
    privacy: string
    /** #312 — links from the brief on-page privacy blurb above to the
     * full standalone policy at `/privacy` (the stable, linkable page
     * both app stores need a URL for). */
    readPrivacyPolicyLabel: string
    /** #346 — links to the full features-summary page (`/features`). */
    viewFeaturesLabel: string
    madeBy: (author: string) => string
    /** Current release-notes version number (simple incrementing counter,
     * ReleaseNotesSection.tsx) — lets a reported bug be pinned to a
     * specific version rather than just a date. */
    currentVersionLabel: (version: number) => string
  }

export interface PrivacyPolicyDict {
    title: string
    description: string
    lastUpdatedLabel: (date: string) => string
    collectionHeading: string
    collectionBody: string
    /** #656 — required disclosure: Health Connect's own permission screen
     * links to this page, and Play Store's Sensitive App Permissions
     * review expects health-data access spelled out explicitly. */
    healthConnectPrivacyHeading: string
    healthConnectPrivacyBody: string
    storageHeading: string
    storageBody: string
    sharingHeading: string
    sharingBody: string
    exportHeading: string
    exportBody: string
    childrenHeading: string
    childrenBody: string
    changesHeading: string
    changesBody: string
    contactHeading: string
    contactBody: string
    backToAboutLabel: string
  }

export interface FeaturesOverviewDict {
    title: string
    description: string
    /** Stable ids for screenshot mapping (#497) — not translated. */
    categories: {
      id:
        | 'dailyLogging'
        | 'meals'
        | 'goals'
        | 'dashboard'
        | 'correlations'
        | 'history'
        | 'yourData'
        | 'makeItYours'
      heading: string
      items: string[]
    }[]
    /** Accessible alt for a category screenshot, e.g. "App screenshot — Daily logging". */
    screenshotAlt: (heading: string) => string
    backToAboutLabel: string
  }
