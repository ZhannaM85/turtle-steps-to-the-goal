import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

export interface ImportFieldOption {
  key: string
  label: string
}

export interface ImportFieldPickerProps {
  ariaLabel: string
  fields: ImportFieldOption[]
  selected: ReadonlySet<string>
  onChange: (selected: Set<string>) => void
}

/**
 * #369 — shared multi-select chip picker for "which data types to import,"
 * reused by both the Zepp Life and Apple Health import flows in
 * `ExportSection.tsx` (each with its own field list, since the two sources
 * expose different data). Same `ToggleGroup` chip pattern `CustomChartView`
 * already uses for its own multi-select series picker.
 */
export function ImportFieldPicker({
  ariaLabel,
  fields,
  selected,
  onChange,
}: ImportFieldPickerProps) {
  return (
    <ToggleGroup
      type="multiple"
      aria-label={ariaLabel}
      value={[...selected]}
      onValueChange={(value: string[]) => onChange(new Set(value))}
      className="w-fit flex-wrap"
    >
      {fields.map((field) => (
        <ToggleGroupItem key={field.key} value={field.key}>
          {field.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
