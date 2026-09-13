import type { AboutDict, PrivacyPolicyDict, FeaturesOverviewDict } from '../types/about'

export const about: AboutDict = {
    title: 'About',
    description: 'What this app is, and why it exists',
    intro:
      'Turtle Steps is a private, local-first companion for understanding weight, nutrition, and the everyday factors around them.',
    tracking:
      'Bring meals, macros, hydration, sleep, activity, body measurements, and any custom metrics you choose together in one place. Explore Features for the full list.',
    philosophy:
      'Instead of focusing on perfect days, Turtle Steps encourages steady weekly progress through small, consistent steps.',
    privacyHeading: 'Private by design.',
    privacy:
      'Everything is stored locally on your device. No accounts. No cloud.',
    readPrivacyPolicyLabel: 'Read the full privacy policy',
    viewFeaturesLabel: 'See everything the app can do',
    madeBy: (author) => `Made by ${author}`,
    currentVersionLabel: (version) => `Version ${version}`,
  }

export const privacyPolicy: PrivacyPolicyDict = {
    title: 'Privacy Policy',
    description: 'How Turtle Steps handles your data',
    lastUpdatedLabel: (date) => `Last updated: ${date}`,
    collectionHeading: 'What we collect',
    collectionBody:
      "Turtle Steps doesn't collect any data automatically. Everything you see in the app was entered by you, or explicitly pulled in at your request — weight, calories, meals, sleep, activity, cycle, notes, and any other field you choose to fill in, plus anything you choose to sync from Health Connect (see below) or import from a backup file.",
    healthConnectPrivacyHeading: 'Health Connect (Android)',
    healthConnectPrivacyBody:
      "On Android, tapping \"Sync from Health Connect\" in Settings reads recent weight, step totals, and sleep sessions (today plus the last several days) from Health Connect, Android's on-device health data store — nothing is read automatically, and nothing is ever written back to Health Connect. This only happens when you tap that button, requires your explicit permission grant, and only ever reads weight, steps, and sleep. Synced values are stored locally the same as any other entry — see \"Where your data lives\" below.",
    storageHeading: 'Where your data lives',
    storageBody:
      "All data is stored locally on your own device, in your browser's or app's own storage. There is no account, no server, and no cloud sync — Turtle Steps never sees your data.",
    sharingHeading: 'Sharing with third parties',
    sharingBody:
      'Your data is never sold, shared, or transmitted anywhere. The app contains no analytics, advertising, or tracking of any kind.',
    exportHeading: 'Exporting your data',
    exportBody:
      'The only way your data ever leaves your device is if you choose to export it yourself (as a JSON backup, Excel, CSV, or Markdown file) from Settings. Where that file goes afterward is entirely up to you.',
    childrenHeading: 'Children',
    childrenBody:
      "Turtle Steps isn't directed at children and doesn't knowingly collect data from anyone, including children — nothing is collected automatically regardless of age.",
    changesHeading: 'Changes to this policy',
    changesBody:
      'If this policy ever changes, the update will be posted on this same page.',
    contactHeading: 'Contact',
    contactBody:
      'Questions about this policy can be sent via the project’s GitHub page.',
    backToAboutLabel: 'Back to About',
  }

export const featuresOverview: FeaturesOverviewDict = {
    title: 'Features',
    description: 'What Turtle Steps can do, all in one place',
    categories: [
      {
        id: 'dailyLogging',
        heading: 'Daily logging',
        items: [
          'Track weight, calories, protein, fat, carbs, and fiber every day',
          'Log sleep, steps, water, and mood alongside your weight',
          'Create number, yes/no, or five-point custom metrics for anything else that matters to you',
          'Optional menstrual cycle and digestion tracking — off by default, and never shown unless you turn it on',
          'Fill sleep from an AutoSleep screenshot, or body composition from a Zepp Life screenshot — tap the image icon on Day, then confirm the numbers before they are saved',
        ],
      },
      {
        id: 'meals',
        heading: 'Meals & food',
        items: [
          'Search a large built-in food database, or build your own personal food list',
          'Scan a barcode to add a packaged food automatically',
          'Build multi-ingredient recipes with the nutrition calculated for you',
          'Mark favorites and reuse your last-logged amount with one tap',
          "React to a dish with an emoji, and copy a whole day's meals to today",
        ],
      },
      {
        id: 'goals',
        heading: 'Goals & progress',
        items: [
          'Set a weekly weight-loss pace instead of one big target number',
          'Optional daily calorie, protein, fat, and carb targets',
          "See whether each week's target was reached, and which weigh-ins it was based on",
        ],
      },
      {
        id: 'dashboard',
        heading: 'Dashboard & trends',
        items: [
          'Weight, calorie, and macro trend charts, plus weekly and monthly summaries',
          'Track waist, hip, body fat, muscle mass, visceral fat, body water, and bone mass over time',
          'Build your own comparison chart from any two tracked metrics',
          "Reorder the Dashboard's sections to match what matters to you",
          'See which dishes you logged most often in the last 7 and 30 days',
          'See which eating reasons came up most often recently',
          'See when meals clustered: morning, afternoon, evening, night',
          'See how often each meal name (Breakfast, Lunch, …) showed up recently',
        ],
      },
      {
        id: 'correlations',
        heading: 'Correlations & insights',
        items: [
          'See how protein intake, cycle phase, or fasting window relate to your weight',
          'Spot patterns without doing any of the math yourself',
        ],
      },
      {
        id: 'history',
        heading: 'History',
        items: [
          'Browse past days as a searchable, filterable list or calendar',
          'Use calendar markers for weight, meals, water, mood, notes, custom metrics, and reached goals',
          'Open any day to review or edit its complete log',
        ],
      },
      {
        id: 'yourData',
        heading: 'Your data, your device',
        items: [
          'Everything is stored locally — no account, no cloud, no tracking',
          'Export a full backup, or as Excel, CSV, or Markdown, any time',
          'Import a backup to restore your data or move to a new device',
          'Import weight, body composition, steps, and meals from Zepp Life, Apple Health, or MyFitnessPal exports',
        ],
      },
      {
        id: 'makeItYours',
        heading: 'Make it yours',
        items: [
          'English and Russian',
          'Light and dark mode, with several color themes',
          'kg or lb, plus a configurable week-start day and day-start time',
        ],
      },
    ],
    screenshotAlt: (heading) => `App screenshot — ${heading}`,
    backToAboutLabel: 'Back to About',
  }
