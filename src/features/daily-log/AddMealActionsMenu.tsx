import { useEffect, useId, useRef, useState } from 'react'
import { ChefHat, ChevronDown, FileJson, QrCode, ScanBarcode, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { CatalogFoodImportDialog } from './CatalogFoodImportDialog'

/**
 * #1060 — the five Add-food actions as one dropdown, half of the
 * why-eating row. Choosing an item runs the same handler as the old tile.
 * #1062 — the menu stays out of flow (`absolute`) so opening it does
 * not push search or the rest of the sheet.
 */
export function AddMealActionsMenu({
  mealLabel,
  onOpenManualAdd,
  onOpenBarcode,
  onOpenRecipe,
  onImportSharedFood,
}: {
  mealLabel: string
  onOpenManualAdd: () => void
  onOpenBarcode: () => void
  onOpenRecipe: () => void
  onImportSharedFood: () => void
}) {
  const t = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [catalogImportOpen, setCatalogImportOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(action: () => void) {
    setOpen(false)
    action()
  }

  const actions: {
    label: string
    ariaLabel?: string
    Icon: LucideIcon
    onClick: () => void
  }[] = [
    {
      label: t.dailyEntry.quickActionAddFoodLabel,
      Icon: Utensils,
      onClick: () => choose(onOpenManualAdd),
    },
    {
      label: t.dailyEntry.scanBarcodeButton,
      ariaLabel: `${t.dailyEntry.scanBarcodeButton} — ${mealLabel}`,
      Icon: ScanBarcode,
      onClick: () => choose(onOpenBarcode),
    },
    {
      label: t.recipes.logRecipeButton,
      Icon: ChefHat,
      onClick: () => choose(onOpenRecipe),
    },
    {
      label: t.dailyEntry.quickActionImportSharedFoodLabel,
      Icon: QrCode,
      onClick: () => choose(onImportSharedFood),
    },
    {
      label: t.dailyEntry.quickActionImportCatalogLabel,
      Icon: FileJson,
      onClick: () => choose(() => setCatalogImportOpen(true)),
    },
  ]

  return (
    <div ref={rootRef} className={cn('relative min-w-0', open && 'z-30')}>
      <button
        type="button"
        aria-label={t.dailyEntry.addMealActionsLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        className="flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{t.dailyEntry.addMealActionsLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div
          id={listId}
          role="menu"
          aria-label={t.dailyEntry.addMealActionsLabel}
          className="absolute top-full right-0 z-30 mt-1 flex w-max min-w-full flex-col rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              aria-label={action.ariaLabel}
              className="flex items-center gap-2 px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
              onClick={action.onClick}
            >
              <action.Icon aria-hidden="true" className="size-4 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      )}
      {catalogImportOpen && (
        <CatalogFoodImportDialog open onOpenChange={setCatalogImportOpen} />
      )}
    </div>
  )
}
