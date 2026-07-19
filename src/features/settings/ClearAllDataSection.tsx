import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { db } from '@/infrastructure/persistence/indexeddb'
import { Button } from '@/shared/ui/button'

/**
 * Wipes every local IndexedDB table (#164) — distinct from just clearing
 * site data via the browser, which most users don't know how to find and
 * which also wipes preferences (theme, locale) stored in localStorage that
 * this deliberately leaves untouched. Two-step confirm, same pattern
 * EntryRow.tsx/MealList.tsx already use for deleting a single entry/meal,
 * scaled up in wording since this is irreversible and total rather than
 * one row.
 */
export function ClearAllDataSection() {
  const t = useTranslation()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  async function handleClear() {
    setIsClearing(true)
    await Promise.all([
      db.goals.clear(),
      db.dailyEntries.clear(),
      db.mealItems.clear(),
      db.foodOverrides.clear(),
    ])
    // A full reload rather than resetting every Zustand store individually
    // — several screens hold their own already-loaded copies of now-wiped
    // data in memory, and a reload is the simplest way to guarantee none
    // of them show stale state.
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t.settings.clearAllDataDescription}
      </p>
      {isConfirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">
            {t.settings.clearAllDataConfirmPrompt}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isClearing}
              onClick={handleClear}
            >
              {isClearing
                ? t.settings.clearingAllDataButton
                : t.settings.clearAllDataConfirmYes}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isClearing}
              onClick={() => setIsConfirming(false)}
            >
              {t.settings.clearAllDataConfirmNo}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="self-start"
          onClick={() => setIsConfirming(true)}
        >
          {t.settings.clearAllDataButton}
        </Button>
      )}
    </div>
  )
}
