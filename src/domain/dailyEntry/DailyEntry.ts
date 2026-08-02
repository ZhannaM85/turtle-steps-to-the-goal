/** The day's overall mood (DailyEntry.emotion) — unchanged by #54. */
export type Emotion = 'happy' | 'unhappy' | 'neutral'

/** A single meal's reaction (#54) — deliberately a different, smaller-stakes
 * set than the day's overall mood: thumbs up/down plus "bellissimo" (a
 * chef's-kiss "this was amazing" tier above thumbs up). */
export type MealEmotion = 'thumbsUp' | 'thumbsDown' | 'bellissimo'

/**
 * One food/dish within a meal (#81) — e.g. "soup", "bread", "cheese" all
 * eaten together at lunch. A meal (`CalorieEntry`) groups 1+ of these;
 * note/time-eaten are shared at the group level, but each item carries its
 * own reaction (#129) — e.g. pizza "bellissimo", milk "thumbs down", in the
 * same meal.
 */
export interface CalorieItem {
  id: string
  name?: string
  /** Brand name (#248), e.g. "Perdue" for "Chicken breast" — purely
   * cosmetic, shown alongside `name` wherever it's displayed. Optional and
   * independent of the reusable `MealItem` name library, which is keyed on
   * `name` alone. */
  brand?: string
  amountKcal: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  /** Dietary fiber in grams (#341) — same optional/additive shape as the
   * three macros above. */
  fiberG?: number
  /** #531 — electrolytes in milligrams for this portion (optional;
   * dashboard tracking lands in #530). */
  sodiumMg?: number
  potassiumMg?: number
  magnesiumMg?: number
  /** Portion weight in grams (#93) — recorded only for manually-entered
   * items (kcal/macros typed directly, not scaled from a per-100g food).
   * Purely a memory aid for logging the same food again at a different
   * portion size later; nothing here recalculates kcal/macros from it. */
  amountG?: number
  /** This dish's own reaction (#129) — moved here from the meal group
   * (CalorieEntry used to carry one shared `emotion` for every item in it,
   * which couldn't tell "loved the pizza, disliked the milk" apart). */
  emotion?: MealEmotion
  /** Per-dish free-text note (#344), e.g. "extra spicy today" — distinct
   * from `CalorieEntry.note` (the whole meal's shared note) the same way
   * `emotion` is distinct from a meal-level reaction. Deliberately not
   * restored from a `MealItem` suggestion the way its nutrition fields
   * are (`selectAddItemMealItem`/`selectEditItemMealItem` in
   * `MealList.tsx`) — same "starts blank regardless of the picked name"
   * behavior `emotion`/`favorite` already have, since a note is
   * situational to *this* logging, not a stable fact about the dish. */
  noteText?: string
}

export interface CalorieEntry {
  id: string
  /** Always at least one item — a group with its last item removed is
   * itself removed, not left empty. */
  items: CalorieItem[]
  /** Custom display name (#110), e.g. "Breakfast" — purely cosmetic,
   * overriding the default positional "Meal N" heading when set. Doesn't
   * affect grouping/ordering, and unrelated to CalorieItem.name (a dish
   * within the meal) or MealItem (the reusable dish-name library). */
  label?: string
  note?: string
  createdAt: string
  /** Time of day the meal was eaten (#65), "HH:MM" 24-hour, e.g. "07:30" —
   * for intermittent-fasting tracking. Time-of-day only, not a full
   * date+time: a meal already belongs to a specific day via its parent
   * DailyEntry. Optional and independently clearable; deliberately NOT
   * cleared or recomputed when meals are reordered (drag-and-drop, #36) —
   * clearing a user-entered time as a side effect of reordering would be a
   * surprising data loss. */
  timeEaten?: string
  /** #454 — a whole-meal "was it tasty?" reaction, set once when finishing
   * adding a meal. Deliberately typed `Emotion` (the day's own happy/
   * neutral/unhappy set, `DAY_EMOTIONS`), not `MealEmotion` — #129 already
   * established that a *shared* reaction across every dish in a meal is the
   * wrong shape for "did I like this specific dish" (moved to `CalorieItem.
   * emotion` for exactly that reason), but "was this meal, as a whole,
   * satisfying" is a genuinely different question with no per-dish
   * ambiguity, and its own smiley/neutral/frown framing matches the day
   * mood's icon set, not the per-item thumbs/bellissimo one. */
  reaction?: Emotion
}

/**
 * One discrete water/hydration log (#271) — replaces #258's single running
 * `waterMl` total, which gave no visible feedback per add (a quick-add tap
 * just quietly changed a number). Each add (quick-add button or manual
 * entry) becomes its own removable entry, the same "add it, see it appear,
 * remove it if wrong" shape `CalorieEntry` items already use, rather than
 * inventing a new feedback mechanism.
 */
export interface WaterEntry {
  id: string
  amountMl: number
}

export interface DailyEntry {
  id: string
  date: string // ISO date, one entry per date
  weightKg?: number
  calorieEntries?: CalorieEntry[]
  note?: string
  /** Overall mood for the day as a whole, distinct from any meal's own emotion (#44). */
  emotion?: Emotion
  /** Sleep (#59) — both optional and independent, same as the rest of this
   * entity's fields. No cross-validation against sleepHours (e.g. a
   * wearable might report deep sleep before total for the same day). */
  sleepHours?: number
  deepSleepHours?: number
  /** Step count (#60) — optional, independent of everything else. */
  steps?: number
  /** Opt-in menstrual cycle tracking (#61) — only ever set when the user
   * has turned the feature on in Settings (`useCycleTrackingStore`); the
   * toggle itself is a local UI preference, not exported with backups, but
   * this logged value is a normal field on the entry like any other. */
  onPeriod?: boolean
  /** Opt-in digestion tracking, same shape as onPeriod above — only ever
   * set when enabled in Settings (`useDigestionTrackingStore`); the toggle
   * itself is a local UI preference, this logged value is a normal field.
   * Tracks the problem (constipation), not the normal day, so the app only
   * ever asks the user to log an exception rather than every good day —
   * `true` here has no relation to the old `hadBowelMovement` field this
   * replaced; that one meant the opposite thing, so no data carried over. */
  hadConstipation?: boolean
  /** #383 — manual override for "did you eat late tonight," layered on top
   * of a derived value (`hadNightEating()`, `domain/dailyEntry/nightEating.ts`)
   * computed from this day's own logged meal `timeEaten` values against a
   * fixed cutoff hour. `undefined` means "no override, use the derived
   * value"; `true`/`false` here always wins over whatever the meal times
   * alone would suggest — e.g. a late meal logged with the wrong time, or a
   * late-night snack that was never logged as a meal at all. Unlike
   * onPeriod/hadConstipation above, not gated behind a Settings opt-in —
   * this needs no extra logging step for anyone already logging meal
   * times, so it's always on. */
  nightEatingOverride?: boolean
  /** Opt-in water/hydration tracking (#258, list shape #271), same gating
   * as onPeriod/hadConstipation above — only ever set when enabled in
   * Settings (`useWaterTrackingStore`). A list of discrete adds rather than
   * a single running total (#271) — sum via `totalWaterMl` for the day's
   * overall amount, don't read entry.length or a stored total directly. */
  waterEntries?: WaterEntry[]
  /** Body measurements (#225) — optional and independent of each other and
   * of weightKg, same shape as sleep/steps above. Always stored in cm
   * (waist/hip) or a plain percentage (body fat); unlike weightKg there's
   * no separate display-unit conversion for these, since the app has no
   * established inches-vs-cm preference the way it does for kg/lb. */
  waistCm?: number
  hipCm?: number
  bodyFatPercent?: number
  /** Body composition (#233) — bioimpedance-scale-style numbers, same
   * bundled-under-one-toggle treatment as the measurements above (a
   * distinct group since these come from a smart scale, not a tape
   * measure/caliper). Manual entry only — this app has no device/scale
   * integration (`PROJECT_BRIEF.md` §2), so these mirror whatever the
   * user's own scale already shows them, typed in by hand. */
  muscleMassKg?: number
  visceralFatRating?: number
  bodyWaterPercent?: number
  boneMassKg?: number
  createdAt: string
  updatedAt: string
}
