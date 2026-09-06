export interface RankingRow {
  key: string
  label: string
  value: string
}

export function RankingList({
  title,
  rows,
}: {
  title: string
  rows: RankingRow[]
}) {
  if (rows.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ol className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 text-muted-foreground">{row.value}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
