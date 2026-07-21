const STORAGE_PREFIX = 'turtle-steps-meal-draft:'

/**
 * Best-effort recovery for the "+ Add item" add-row's in-progress dish
 * (#221) — every other field on this form already saves the instant its
 * own Save button is tapped (#31); the one real gap is text typed into the
 * add-row/its item sheet but not yet committed via the meal group's own
 * Save, which a page reload or navigating away previously lost outright.
 * Purely a local-device convenience, keyed by date — never exported/
 * imported with the app's real data (export/import already covers
 * everything actually committed via `addMeal()`).
 */
export function loadMealDraft<T>(date: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + date)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveMealDraft<T>(date: string, draft: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(draft))
  } catch {
    // Best-effort — localStorage can throw (quota, private browsing).
    // Losing draft recovery silently isn't worth surfacing an error for.
  }
}

export function clearMealDraft(date: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + date)
  } catch {
    // Same best-effort reasoning as saveMealDraft.
  }
}
