import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button, type buttonVariants } from '@/shared/ui/button'
import type { VariantProps } from 'class-variance-authority'

/** Generic over both the day's mood (Emotion) and a meal item's reaction
 * (MealEmotion, #54; moved from meal-group to per-item by #129) — the two
 * sets differ, so options/labelFor are passed in rather than hardcoded, but
 * the picker UI itself is identical. Its own file (not defined inside
 * DailyEntryForm.tsx) since #129 needs it in MealItemEditorSheet.tsx too,
 * and DailyEntryForm.tsx already imports from that file. */
export function EmotionPicker<E extends string>({
  value,
  onChange,
  options,
  labelFor,
  contextLabel,
  size = 'icon-sm',
}: {
  value: E | undefined
  onChange: (emotion: E | undefined) => void
  options: { value: E; Icon?: LucideIcon; emoji?: string }[]
  labelFor: (emotion: E) => string
  /**
   * Disambiguates this picker's buttons from another EmotionPicker visible
   * at the same time (e.g. the day-mood picker plus an item's own picker
   * open at once) — without it, two buttons named plain "Happy" would both
   * exist on screen at once.
   */
  contextLabel?: string
  /** Defaults to the day-mood picker's existing compact size (#84); the
   * per-item reaction picker in MealItemEditorSheet.tsx passes `icon-xl`
   * instead, to match that sheet's h-12 fields (#133). */
  size?: VariantProps<typeof buttonVariants>['size']
}) {
  return (
    <div className="flex items-center gap-3">
      {options.map(({ value: emotion, Icon, emoji }) => {
        const label = labelFor(emotion)
        return (
          <Button
            key={emotion}
            type="button"
            variant="ghost"
            size={size}
            aria-label={contextLabel ? `${label} — ${contextLabel}` : label}
            aria-pressed={value === emotion}
            // bg-muted alone (the old style) sits too close to
            // --background in dark mode to read as "selected" — and for
            // emoji options (unlike the lucide-icon options) text-foreground
            // has no visual effect at all, so the background/border was the
            // *only* indicator (#84). --primary is deliberately
            // high-contrast against background in every mood theme, so a
            // border + tint reliably reads as selected everywhere.
            className={cn(
              value === emotion &&
                'border-2 border-primary bg-primary/15 text-foreground',
            )}
            onClick={() => onChange(value === emotion ? undefined : emotion)}
          >
            {Icon ? (
              <Icon aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="text-base leading-none">
                {emoji}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
