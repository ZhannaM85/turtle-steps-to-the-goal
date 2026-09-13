/** Shared status line under an Export / Import block (#868). */

export function SectionStatus({
  children,
  error,
}: {
  children: string
  error?: boolean
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {children}
      </p>
    )
  }
  return <p className="text-sm text-muted-foreground">{children}</p>
}
