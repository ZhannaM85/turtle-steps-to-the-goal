import { storeVersions } from '@/data/storeVersions'
import { formatLocalizedDate, useLocale } from '@/i18n'

export function StoreVersionHistory() {
  const locale = useLocale()

  return (
    <ul className="flex max-h-80 flex-col gap-2.5 overflow-y-auto text-sm">
      {storeVersions.map((note) => (
        <li key={note.version} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {note.version} · {formatLocalizedDate(note.date, locale)}
          </span>
          <span className="whitespace-pre-line text-foreground">
            {note[locale]}
          </span>
        </li>
      ))}
    </ul>
  )
}
