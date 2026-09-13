/** Shared status helper under an Export / Import block (#868). */

export function sectionErrorMessage(
  status: { kind: string; section?: string; message?: string },
  section: string,
): string | null {
  return status.kind === 'error' && status.section === section
    ? (status.message ?? null)
    : null
}
