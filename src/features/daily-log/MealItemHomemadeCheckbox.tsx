import { useTranslation } from '@/i18n'

/** #994 — homemade is a catalog flag, separate from the brand field. */
export function MealItemHomemadeCheckbox({
  homemade,
  onHomemadeChange,
}: {
  homemade: boolean
  onHomemadeChange: (homemade: boolean) => void
}) {
  const t = useTranslation()
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 text-sm font-medium text-foreground">
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-primary"
        checked={homemade}
        onChange={(event) => onHomemadeChange(event.target.checked)}
      />
      {t.dailyEntry.homemadeDishLabel}
    </label>
  )
}
