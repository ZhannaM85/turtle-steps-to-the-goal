import { useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { SectionAccordion } from '@/shared/ui/section-accordion'
import { Textarea } from '@/shared/ui/textarea'
import {
  reorderWhyDoingThisDraft,
  useWhyDoingThisStore,
  type WhyDoingThisCard,
} from '@/stores/whyDoingThisStore'
import { useTrackedFieldsStore } from '@/stores/trackedFieldsStore'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import {
  DayFieldHeaderCancelButton,
  DayFieldHeaderDeleteButton,
  DayFieldHeaderEditButton,
  DayFieldHeaderSaveButton,
} from './DayFieldHeader'

function newCardId(): string {
  return crypto.randomUUID()
}

function savedCards(draft: WhyDoingThisCard[]): WhyDoingThisCard[] {
  return draft
    .map((card) => ({ ...card, text: card.text.trim() }))
    .filter((card) => card.text !== '')
}

function SortableReasonRow({
  id,
  index,
  children,
}: {
  id: string
  index: number
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const dragHandle = (
    <button
      type="button"
      aria-label={t.today.whyDoingThisReorderLabel(index + 1)}
      className="mt-3 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  )
  return (
    <li ref={setNodeRef} style={style} className="flex items-start gap-2">
      {children(dragHandle)}
    </li>
  )
}

/**
 * #1115 — opt-in reasons under the weekly target. Same list on every date.
 * Collapsed until opened. Pencil edits the whole stack; nothing is stored
 * on each keystroke. Not a Day pin.
 */
export function WhyDoingThisSection() {
  const t = useTranslation()
  const enabled = useTrackedFieldsStore((state) => state.tracked.whyDoingThis)
  const cards = useWhyDoingThisStore((state) => state.cards)
  const setCards = useWhyDoingThisStore((state) => state.setCards)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<WhyDoingThisCard[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  if (!enabled) return null

  const title = t.today.whyDoingThisTitle

  function openEdit() {
    setDraft(cards.map((card) => ({ ...card })))
    setPendingDeleteId(null)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft([])
    setPendingDeleteId(null)
    setEditing(false)
  }

  function saveEdit() {
    setCards(savedCards(draft))
    setDraft([])
    setPendingDeleteId(null)
    setEditing(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDraft((current) =>
      reorderWhyDoingThisDraft(current, String(active.id), String(over.id)),
    )
  }

  function addCard() {
    setPendingDeleteId(null)
    setDraft((current) => [...current, { id: newCardId(), text: '' }])
  }

  if (editing) {
    return (
      <div className="section-shell flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="flex shrink-0 items-center gap-1">
            <DayFieldHeaderSaveButton
              label={t.today.whyDoingThisSaveLabel}
              onClick={saveEdit}
            />
            <DayFieldHeaderCancelButton
              label={t.today.whyDoingThisCancelLabel}
              onClick={cancelEdit}
            />
          </span>
        </div>
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={draft.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {draft.map((card, index) => (
                <SortableReasonRow key={card.id} id={card.id} index={index}>
                  {(dragHandle) => (
                    <>
                      {dragHandle}
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        {pendingDeleteId === card.id ? (
                          <ConfirmDeleteEntryBar
                            label={t.today.whyDoingThisConfirmDeleteLabel}
                            onConfirm={() => {
                              setDraft((current) =>
                                current.filter((item) => item.id !== card.id),
                              )
                              setPendingDeleteId(null)
                            }}
                            onCancel={() => setPendingDeleteId(null)}
                          />
                        ) : null}
                        <div className="flex items-start gap-1">
                          <Textarea
                            aria-label={t.today.whyDoingThisCardLabel(index + 1)}
                            value={card.text}
                            onChange={(event) => {
                              const text = event.target.value
                              setDraft((current) =>
                                current.map((item) =>
                                  item.id === card.id ? { ...item, text } : item,
                                ),
                              )
                            }}
                            className="min-h-12 flex-1"
                          />
                          <DayFieldHeaderDeleteButton
                            label={t.today.whyDoingThisDeleteLabel(index + 1)}
                            onClick={() => setPendingDeleteId(card.id)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </SortableReasonRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <Button type="button" variant="outline" size="sm" onClick={addCard}>
          {t.today.whyDoingThisAddLabel}
        </Button>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="section-shell flex items-center justify-between gap-2 p-3">
        <span className="text-sm font-medium">{title}</span>
        <DayFieldHeaderEditButton
          label={t.today.whyDoingThisEditLabel}
          onClick={openEdit}
        />
      </div>
    )
  }

  return (
    <SectionAccordion
      open={open}
      onOpenChange={setOpen}
      title={title}
      expandLabel={t.today.whyDoingThisExpandLabel}
      collapseLabel={t.today.whyDoingThisCollapseLabel}
      actions={
        <DayFieldHeaderEditButton
          label={t.today.whyDoingThisEditLabel}
          onClick={openEdit}
        />
      }
      contentClassName="flex flex-col gap-2 pt-2"
    >
      {cards.map((card) => (
        <p
          key={card.id}
          className="rounded-lg border border-border px-3 py-2 text-sm whitespace-pre-wrap"
        >
          {card.text}
        </p>
      ))}
    </SectionAccordion>
  )
}
