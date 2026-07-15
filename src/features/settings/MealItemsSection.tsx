import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n'
import type { MealItem } from '@/domain/mealItem'
import { useMealItemStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

function MealItemRow({
  item,
  onRename,
  onDelete,
}: {
  item: MealItem
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const t = useTranslation()
  const [value, setValue] = useState(item.name)

  function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== item.name) {
      onRename(item.id, trimmed)
    } else {
      setValue(item.name)
    }
  }

  return (
    <li className="flex items-center gap-2">
      <Input
        type="text"
        aria-label={t.settings.mealItemNameLabel}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className="h-8 flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t.settings.deleteMealItemLabel(item.name)}
        onClick={() => onDelete(item.id)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </li>
  )
}

export function MealItemsSection() {
  const t = useTranslation()
  const items = useMealItemStore((state) => state.items)
  const loadItems = useMealItemStore((state) => state.loadItems)
  const rename = useMealItemStore((state) => state.rename)
  const deleteItem = useMealItemStore((state) => state.deleteItem)

  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.mealItemsDescription}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.settings.mealItemsEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onRename={rename}
              onDelete={deleteItem}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
