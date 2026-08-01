import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import type { DailyEntryImportMode } from './mergeDailyEntryPatches'

export interface ImportConflictModePickerProps {
  ariaLabel: string
  value: DailyEntryImportMode
  onChange: (mode: DailyEntryImportMode) => void
  fillGapsLabel: string
  overwriteLabel: string
}

/**
 * #496 — shared single-select for "Fill gaps only" vs "Overwrite with
 * import" on external-source imports (Zepp Life / Apple Health /
 * MyFitnessPal). Same ToggleGroup chip pattern as ImportFieldPicker /
 * History view toggle. Default in ExportSection is fillGaps so a re-import
 * does not wipe manual corrections.
 */
export function ImportConflictModePicker({
  ariaLabel,
  value,
  onChange,
  fillGapsLabel,
  overwriteLabel,
}: ImportConflictModePickerProps) {
  return (
    <ToggleGroup
      type="single"
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next: string) => {
        // Radix allows deselecting the only item; ignore empty so one mode
        // is always chosen.
        if (next === 'fillGaps' || next === 'overwrite') onChange(next)
      }}
      className="w-fit flex-wrap"
    >
      <ToggleGroupItem value="fillGaps">{fillGapsLabel}</ToggleGroupItem>
      <ToggleGroupItem value="overwrite">{overwriteLabel}</ToggleGroupItem>
    </ToggleGroup>
  )
}
