/** One card-style section (#344 redesign) — a bordered, rounded group
 * around a logical piece of the form (name, quantity, nutrition, etc.). */
export function MealItemFormSection({
  heading,
  headingAction,
  children,
}: {
  heading?: string
  headingAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {heading && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {heading}
          </span>
          {headingAction}
        </div>
      )}
      {children}
    </div>
  )
}
