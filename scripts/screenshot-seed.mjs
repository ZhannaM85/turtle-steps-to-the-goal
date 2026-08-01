/**
 * Demo data for the README screenshots (#495).
 *
 * Shaped as a real v7 export bundle (`src/features/export/
 * exportBundleSchema.ts`) so `capture-screenshots.mjs` can seed it through
 * the app's own Settings → Import backup path instead of writing IndexedDB
 * records by hand — hand-seeding silently drops nested/computed fields and
 * has to be re-taught the schema every time it changes.
 *
 * Values are invented but plausible: a ~12-week stretch of steady loss at
 * roughly the goal pace, complete enough that every screenshotted section
 * (trends, weekly summaries, correlations, calendar markers) has real data
 * behind it. Randomness is seeded, so re-running produces the same numbers
 * for the same day span and only the dates move.
 */

const DAYS = 84
const START_WEIGHT_KG = 72.4
const WEEKLY_LOSS_KG = 0.45

/** Deterministic PRNG (mulberry32) — same demo numbers on every run. */
function createRandom(seed) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function round(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function pick(random, options) {
  return options[Math.floor(random() * options.length)]
}

const BREAKFASTS = [
  {
    name: 'Oatmeal with berries',
    kcal: 320,
    p: 11,
    f: 7,
    c: 54,
    fib: 7,
    g: 280,
  },
  {
    name: 'Greek yogurt & honey',
    kcal: 210,
    p: 18,
    f: 5,
    c: 24,
    fib: 1,
    g: 200,
  },
  {
    name: 'Scrambled eggs & toast',
    kcal: 380,
    p: 22,
    f: 19,
    c: 30,
    fib: 3,
    g: 240,
  },
  {
    name: 'Cottage cheese & peach',
    kcal: 240,
    p: 24,
    f: 5,
    c: 22,
    fib: 2,
    g: 250,
  },
]

const LUNCHES = [
  {
    name: 'Grilled chicken salad',
    kcal: 480,
    p: 42,
    f: 18,
    c: 30,
    fib: 6,
    g: 380,
  },
  {
    name: 'Salmon with quinoa',
    kcal: 560,
    p: 38,
    f: 24,
    c: 44,
    fib: 5,
    g: 340,
  },
  { name: 'Turkey wrap', kcal: 470, p: 33, f: 15, c: 48, fib: 5, g: 300 },
  { name: 'Lentil soup', kcal: 360, p: 21, f: 8, c: 52, fib: 11, g: 400 },
]

const DINNERS = [
  {
    name: 'Baked cod & vegetables',
    kcal: 390,
    p: 36,
    f: 12,
    c: 28,
    fib: 7,
    g: 400,
  },
  {
    name: 'Beef stir-fry with rice',
    kcal: 610,
    p: 34,
    f: 20,
    c: 68,
    fib: 5,
    g: 420,
  },
  { name: 'Vegetable omelette', kcal: 330, p: 24, f: 21, c: 9, fib: 3, g: 260 },
  {
    name: 'Chicken & roasted potatoes',
    kcal: 520,
    p: 38,
    f: 17,
    c: 50,
    fib: 6,
    g: 380,
  },
]

const SNACKS = [
  { name: 'Apple', kcal: 95, p: 1, f: 0.3, c: 25, fib: 4, g: 180 },
  { name: 'Almonds', kcal: 170, p: 6, f: 15, c: 6, fib: 3, g: 30 },
  { name: 'Protein shake', kcal: 160, p: 25, f: 3, c: 8, fib: 1, g: 300 },
  { name: 'Dark chocolate', kcal: 120, p: 2, f: 9, c: 9, fib: 2, g: 20 },
]

const DAY_NOTES = [
  'Walked home from work instead of taking the bus.',
  'Slept badly, hungrier than usual all day.',
  'Long walk in the park after dinner.',
  'Busy day — ate later than I wanted to.',
  'Felt light and energetic today.',
]

const WATER_ADDS = [250, 300, 500]

function buildItem(random, dish, index) {
  const item = {
    id: `item-${index}`,
    name: dish.name,
    amountKcal: dish.kcal,
    proteinG: dish.p,
    fatG: dish.f,
    carbsG: dish.c,
    fiberG: dish.fib,
    amountG: dish.g,
  }
  const roll = random()
  if (roll > 0.82) item.emotion = 'bellissimo'
  else if (roll > 0.55) item.emotion = 'thumbsUp'
  return item
}

function buildMeals(random, isoDate, createdAt) {
  const plan = [
    { label: 'Breakfast', time: '08:20', dish: pick(random, BREAKFASTS) },
    { label: 'Lunch', time: '13:10', dish: pick(random, LUNCHES) },
    { label: 'Snack', time: '16:30', dish: pick(random, SNACKS) },
    { label: 'Dinner', time: '19:05', dish: pick(random, DINNERS) },
  ]

  return plan.map((meal, index) => {
    const entry = {
      id: `${isoDate}-meal-${index}`,
      label: meal.label,
      items: [buildItem(random, meal.dish, `${isoDate}-${index}`)],
      timeEaten: meal.time,
      createdAt,
    }
    if (meal.label === 'Lunch' && random() > 0.7) {
      entry.items.push(
        buildItem(
          random,
          { name: 'Rye bread', kcal: 130, p: 4, f: 1, c: 25, fib: 3, g: 50 },
          `${isoDate}-${index}b`,
        ),
      )
    }
    if (random() > 0.8) entry.reaction = 'happy'
    return entry
  })
}

function buildWaterEntries(random, isoDate) {
  const adds = 5 + Math.floor(random() * 4)
  return Array.from({ length: adds }, (_, index) => ({
    id: `${isoDate}-water-${index}`,
    amountMl: pick(random, WATER_ADDS),
  }))
}

export function buildSeedBundle(today = new Date()) {
  const random = createRandom(20260801)
  const firstDay = addDays(today, -(DAYS - 1))
  const dailyEntries = []
  const customMetricEntries = []

  for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
    const date = addDays(firstDay, dayIndex)
    const isoDate = toIsoDate(date)
    const timestamp = `${isoDate}T07:30:00.000Z`

    // Trend plus day-to-day water-weight noise, so the chart looks like a
    // real scale rather than a straight line.
    const trend = START_WEIGHT_KG - (WEEKLY_LOSS_KG / 7) * dayIndex
    const noise = (random() - 0.45) * 0.7
    const weightKg = round(trend + noise, 2)

    const entry = {
      id: `entry-${isoDate}`,
      date: isoDate,
      weightKg,
      calorieEntries: buildMeals(random, isoDate, timestamp),
      waterEntries: buildWaterEntries(random, isoDate),
      sleepHours: round(6.4 + random() * 1.9, 1),
      deepSleepHours: round(1.1 + random() * 1.1, 1),
      steps: 3800 + Math.floor(random() * 9000),
      emotion: random() > 0.78 ? 'neutral' : 'happy',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    if (random() > 0.72) entry.note = pick(random, DAY_NOTES)

    // Tape measure and smart-scale readings are occasional by nature —
    // roughly weekly, on the same weekday.
    if (dayIndex % 7 === 0 || dayIndex === DAYS - 1) {
      entry.waistCm = round(84 - dayIndex * 0.06 + random() * 0.6, 1)
      entry.hipCm = round(104 - dayIndex * 0.05 + random() * 0.6, 1)
      entry.bodyFatPercent = round(33.5 - dayIndex * 0.045 + random() * 0.4, 1)
      entry.muscleMassKg = round(26.4 + dayIndex * 0.008 + random() * 0.2, 1)
      entry.visceralFatRating = round(8.4 - dayIndex * 0.012, 1)
      entry.bodyWaterPercent = round(49 + dayIndex * 0.02 + random() * 0.5, 1)
      entry.boneMassKg = round(2.5 + random() * 0.1, 1)
    }

    dailyEntries.push(entry)

    customMetricEntries.push({
      id: `energy-${isoDate}`,
      metricId: 'metric-energy',
      date: isoDate,
      value: 2 + Math.floor(random() * 4),
      updatedAt: timestamp,
    })
    if (random() > 0.15) {
      customMetricEntries.push({
        id: `coffee-${isoDate}`,
        metricId: 'metric-coffee',
        date: isoDate,
        value: 1 + Math.floor(random() * 3),
        updatedAt: timestamp,
      })
    }
  }

  const todayIso = toIsoDate(today)
  const createdAt = `${toIsoDate(firstDay)}T07:00:00.000Z`

  return {
    version: 7,
    exportedAt: new Date(today).toISOString(),
    goals: [
      {
        id: 'goal-demo',
        targetWeeklyLossKg: 0.5,
        weekStart: toIsoDate(addDays(today, -3)),
        dailyCalorieTargetKcal: 1600,
        dailyProteinTargetG: 95,
        dailyFatTargetG: 55,
        dailyCarbTargetG: 165,
        dailyFiberTargetG: 25,
        dailyWaterTargetMl: 2000,
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
    ],
    dailyEntries,
    mealItems: [
      {
        id: 'meal-item-oatmeal',
        name: 'Oatmeal with berries',
        lastAmountKcal: 320,
        lastProteinG: 11,
        lastFatG: 7,
        lastCarbsG: 54,
        lastFiberG: 7,
        lastAmountG: 280,
        favorite: true,
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
      {
        id: 'meal-item-chicken-salad',
        name: 'Grilled chicken salad',
        lastAmountKcal: 480,
        lastProteinG: 42,
        lastFatG: 18,
        lastCarbsG: 30,
        lastFiberG: 6,
        lastAmountG: 380,
        favorite: true,
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
      {
        id: 'meal-item-shake',
        name: 'Protein shake',
        lastAmountKcal: 160,
        lastProteinG: 25,
        lastFatG: 3,
        lastCarbsG: 8,
        lastAmountG: 300,
        barcode: '4056489176022',
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
    ],
    recipes: [
      {
        id: 'recipe-lentil-soup',
        name: 'Lentil soup',
        servings: 4,
        ingredients: [
          {
            id: 'ing-1',
            name: 'Red lentils',
            amountKcal: 1164,
            proteinG: 84,
            fatG: 4,
            carbsG: 200,
            amountG: 340,
          },
          {
            id: 'ing-2',
            name: 'Carrot',
            amountKcal: 41,
            proteinG: 1,
            fatG: 0,
            carbsG: 10,
            amountG: 100,
          },
          {
            id: 'ing-3',
            name: 'Onion',
            amountKcal: 40,
            proteinG: 1,
            fatG: 0,
            carbsG: 9,
            amountG: 100,
          },
          {
            id: 'ing-4',
            name: 'Olive oil',
            amountKcal: 240,
            proteinG: 0,
            fatG: 27,
            carbsG: 0,
            amountG: 27,
          },
        ],
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
      {
        id: 'recipe-overnight-oats',
        name: 'Overnight oats',
        servings: 2,
        ingredients: [
          {
            id: 'ing-5',
            name: 'Rolled oats',
            amountKcal: 380,
            proteinG: 13,
            fatG: 7,
            carbsG: 66,
            amountG: 100,
          },
          {
            id: 'ing-6',
            name: 'Greek yogurt',
            amountKcal: 118,
            proteinG: 20,
            fatG: 1,
            carbsG: 7,
            amountG: 200,
          },
          {
            id: 'ing-7',
            name: 'Blueberries',
            amountKcal: 57,
            proteinG: 1,
            fatG: 0,
            carbsG: 14,
            amountG: 100,
          },
        ],
        createdAt,
        updatedAt: `${todayIso}T07:00:00.000Z`,
      },
    ],
    customMetrics: [
      {
        id: 'metric-energy',
        name: 'Energy level',
        inputKind: 'scale5',
        createdAt,
      },
      {
        id: 'metric-coffee',
        name: 'Coffee',
        inputKind: 'number',
        unit: 'cups',
        createdAt,
      },
    ],
    customMetricEntries,
    customCorrelations: [
      {
        id: 'correlation-coffee-sleep',
        metricA: { kind: 'custom', metricId: 'metric-coffee' },
        metricB: { kind: 'builtin', key: 'sleep' },
        createdAt,
      },
    ],
  }
}

/**
 * localStorage preferences the bundle deliberately does not carry (they're
 * device-local by design — see `stores/profileStore.ts`). Set before the
 * app boots so the screenshots show BMI/BMR and the opt-in water tracker.
 */
export const SEED_PREFERENCES = {
  'turtle-steps-theme': {
    state: { mood: 'tortoise', colorScheme: 'light' },
    version: 0,
  },
  'turtle-steps-profile': {
    state: { heightCm: 168, age: 34, sex: 'female', activityLevel: 'light' },
    version: 0,
  },
  'turtle-steps-water-tracking': { state: { enabled: true }, version: 0 },
  'turtle-steps-locale': { state: { locale: 'en' }, version: 0 },
  'turtle-steps-unit': { state: { unit: 'kg' }, version: 0 },
}
