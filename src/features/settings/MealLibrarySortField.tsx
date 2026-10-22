import { useTranslation } from '@/i18n'
import {
  isMealLibrarySort,
  type MealLibrarySort,
} from '@/shared/lib/sortMealLibraryItems'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

/** #684 / #1111 — Settings → Dishes list order. Preference lives in localStorage. */
export function MealLibrarySortField({
  sort,
  onSort,
}: {
  sort: MealLibrarySort
  onSort: (sort: MealLibrarySort) => void
}) {
  const t = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="meal-library-sort">{t.settings.mealItemsSortLabel}</Label>
      <Select
        id="meal-library-sort"
        aria-label={t.settings.mealItemsSortLabel}
        value={sort}
        onChange={(event) => {
          const next = event.target.value
          if (isMealLibrarySort(next)) onSort(next)
        }}
      >
        <option value="title-asc">{t.settings.mealItemsSortTitleAsc}</option>
        <option value="title-desc">{t.settings.mealItemsSortTitleDesc}</option>
        <option value="added-newest">
          {t.settings.mealItemsSortAddedNewest}
        </option>
        <option value="added-oldest">
          {t.settings.mealItemsSortAddedOldest}
        </option>
        <option value="eaten-newest">
          {t.settings.mealItemsSortEatenNewest}
        </option>
        <option value="eaten-oldest">
          {t.settings.mealItemsSortEatenOldest}
        </option>
      </Select>
    </div>
  )
}
