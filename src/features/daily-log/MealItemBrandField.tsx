import { useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import { CollapseChevronIcon } from '@/shared/ui/collapse-chevron'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import { BrandAutocomplete } from './BrandAutocomplete'

/**
 * Optional brand on Add dish (#993). Empty brands stay collapsed so the
 * row does not take a full field; a dish that already has a brand opens
 * expanded. A value that arrives while the sheet is open (scan, edit)
 * opens it too.
 */
export function MealItemBrandField({
  open,
  brand,
  onBrandChange,
  onSubmit,
  mealItems,
}: {
  open: boolean
  brand: string
  onBrandChange: (value: string) => void
  onSubmit: () => void
  mealItems: MealItem[]
}) {
  const t = useTranslation()
  const [expanded, setExpanded] = useState(() => brand.trim().length > 0)
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevBrand, setPrevBrand] = useState(brand)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setExpanded(brand.trim().length > 0)
  }
  if (brand !== prevBrand) {
    const previous = prevBrand
    setPrevBrand(brand)
    if (open && previous.trim().length === 0 && brand.trim().length > 0) {
      setExpanded(true)
    }
  }

  const label = t.dailyEntry.itemBrandLabel

  return (
    <div
      className={cn(
        'rounded-xl border border-border',
        expanded ? 'p-4' : 'px-4',
      )}
    >
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex min-h-11 w-full items-center justify-between gap-2 bg-transparent text-left"
          >
            <span className="text-sm font-medium text-foreground">{label}</span>
            <CollapseChevronIcon expanded={expanded} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3">
            <BrandAutocomplete
              ariaLabel={label}
              placeholder={t.dailyEntry.itemBrandPlaceholder}
              value={brand}
              onChange={onBrandChange}
              onSubmit={onSubmit}
              mealItems={mealItems}
              enabled={open}
              className="h-12 text-base"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
