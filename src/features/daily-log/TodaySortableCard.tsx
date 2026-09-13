import { type ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslation } from '@/i18n'
import type { TodayCardKey } from '@/stores'

export function TodaySortableCard({
  id,
  position,
  isReordering,
  children,
}: {
  id: TodayCardKey
  position: number
  isReordering: boolean
  children: ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled: !isReordering })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      {isReordering && (
        <button
          type="button"
          aria-label={t.today.reorderCardLabel(position)}
          className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
