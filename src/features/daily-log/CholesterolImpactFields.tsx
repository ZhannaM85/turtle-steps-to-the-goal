import { useId } from 'react'
import {
  CHOLESTEROL_IMPACTS,
  isCholesterolImpact,
  type CholesterolImpact,
} from '@/domain/cholesterol'
import { useTranslation } from '@/i18n'
import { cholesterolImpactLabel } from '@/shared/lib/cholesterolImpactLabel'
import { useLdlImpactStore } from '@/stores'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { MealItemFormSection } from './MealItemFormSection'

const REASON_MAX_LENGTH = 120

/** #1013 — LDL level and an optional reason on add/edit food.
 * Hidden when Settings → LDL is off; the caller keeps stored values. */
export function CholesterolImpactFields({
  impact,
  reason,
  onCholesterolChange,
}: {
  impact: CholesterolImpact
  reason: string
  onCholesterolChange?: (patch: {
    cholesterolImpact?: CholesterolImpact
    cholesterolReason?: string
  }) => void
}) {
  const t = useTranslation()
  const enabled = useLdlImpactStore((state) => state.enabled)
  const reasonId = useId()
  if (!enabled) return null

  return (
    <MealItemFormSection heading={t.dailyEntry.cholesterolLdlImpactLabel}>
      <p className="text-xs text-muted-foreground">
        {t.dailyEntry.cholesterolImpactFormHint}
      </p>
      <Select
        aria-label={t.dailyEntry.cholesterolLdlImpactLabel}
        data-testid="cholesterol-impact-picker"
        value={impact}
        onChange={(event) => {
          const value = event.target.value
          if (isCholesterolImpact(value)) {
            onCholesterolChange?.({ cholesterolImpact: value })
          }
        }}
        className="h-12 text-base"
      >
        {CHOLESTEROL_IMPACTS.map((value) => (
          <option key={value} value={value}>
            {cholesterolImpactLabel(value, t)}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={reasonId}>{t.dailyEntry.cholesterolReasonLabel}</Label>
        <Input
          id={reasonId}
          aria-label={t.dailyEntry.cholesterolReasonLabel}
          data-testid="cholesterol-reason"
          placeholder={t.dailyEntry.cholesterolReasonPlaceholder}
          value={reason}
          maxLength={REASON_MAX_LENGTH}
          onChange={(event) =>
            onCholesterolChange?.({ cholesterolReason: event.target.value })
          }
          className="h-12 text-base"
        />
      </div>
    </MealItemFormSection>
  )
}

