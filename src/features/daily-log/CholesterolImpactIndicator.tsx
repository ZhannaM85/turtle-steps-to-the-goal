import { useId, useState } from 'react'
import type { CholesterolImpact } from '@/domain/cholesterol'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'

const EMOJI: Record<CholesterolImpact, string> = {
  beneficial: '🟢',
  neutral: '⚪',
  moderate: '🟡',
  limit: '🟠',
  high: '🔴',
  unknown: '⚪',
}

/** #1008 — compact LDL label next to a dish's calories. Tap shows the reason. */
export function CholesterolImpactIndicator({
  impact,
  reason,
}: {
  impact: CholesterolImpact
  reason?: string
}) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const reasonId = useId()
  const level = levelLabel(impact, t)
  const tip = reason
    ? `${t.dailyEntry.cholesterolLdlImpactLabel} / ${EMOJI[impact]} ${level} / ${reason}`
    : `${t.dailyEntry.cholesterolLdlImpactLabel} / ${EMOJI[impact]} ${level}`

  return (
    <div className="min-w-0">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-auto px-1.5 font-normal text-muted-foreground"
        aria-expanded={open}
        aria-controls={reasonId}
        aria-label={t.dailyEntry.cholesterolImpactButtonLabel(level)}
        data-testid="cholesterol-impact"
        data-cholesterol-impact={impact}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">
          {EMOJI[impact]} {level}
        </span>
      </Button>
      {open && (
        <p
          id={reasonId}
          className="px-1.5 text-xs text-muted-foreground"
          data-testid="cholesterol-impact-reason"
        >
          {tip}
        </p>
      )}
    </div>
  )
}

function levelLabel(
  impact: CholesterolImpact,
  t: ReturnType<typeof useTranslation>,
): string {
  switch (impact) {
    case 'beneficial':
      return t.dailyEntry.cholesterolImpactBeneficial
    case 'neutral':
      return t.dailyEntry.cholesterolImpactNeutral
    case 'moderate':
      return t.dailyEntry.cholesterolImpactModerate
    case 'limit':
      return t.dailyEntry.cholesterolImpactLimit
    case 'high':
      return t.dailyEntry.cholesterolImpactHigh
    case 'unknown':
      return t.dailyEntry.cholesterolImpactUnknown
  }
}
