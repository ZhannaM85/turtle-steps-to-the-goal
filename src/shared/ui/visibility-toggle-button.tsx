import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export interface VisibilityToggleButtonProps {
  visible: boolean
  onToggle: () => void
  hideLabel: string
  showLabel: string
}

/**
 * Just the eye-icon button (#232) — no title — for slotting into an
 * already-labeled element (e.g. `StatCard`'s own label row) instead of
 * duplicating that label in a separate title row above it.
 * `SectionTitleWithToggle` composes this with its own `<h2>` for the
 * cases that don't already have a visible label of their own.
 */
export function VisibilityToggleButton({
  visible,
  onToggle,
  hideLabel,
  showLabel,
}: VisibilityToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-pressed={visible}
      aria-label={visible ? hideLabel : showLabel}
      onClick={(event) => {
        // #430 — StatCard can carry its own onClick (e.g. the water card's
        // scroll-to-section behavior); without this, a click here bubbles
        // up and fires that too.
        event.stopPropagation()
        onToggle()
      }}
    >
      {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
    </Button>
  )
}
