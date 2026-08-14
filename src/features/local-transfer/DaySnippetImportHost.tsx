import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDaySnippetDialog } from './ConfirmDaySnippetDialog'
import {
  decodeDaySnippetPayload,
  SHARE_DAY_QUERY_PARAM,
} from './daySnippetPayload'
import { useDayTransferUiStore } from './dayTransferUiStore'

/**
 * #721 — mounts once under AppShell: watches `?shareDay=` and owns the
 * confirm dialog. Must not run Epic 8 full-backup import.
 */
export function DaySnippetImportHost() {
  const [searchParams, setSearchParams] = useSearchParams()
  const confirmOpen = useDayTransferUiStore((s) => s.confirmOpen)
  const payload = useDayTransferUiStore((s) => s.payload)
  const openConfirm = useDayTransferUiStore((s) => s.openConfirm)
  const setConfirmOpen = useDayTransferUiStore((s) => s.setConfirmOpen)

  useEffect(() => {
    const raw = searchParams.get(SHARE_DAY_QUERY_PARAM)
    if (!raw) return
    const decoded = decodeDaySnippetPayload(raw)
    const next = new URLSearchParams(searchParams)
    next.delete(SHARE_DAY_QUERY_PARAM)
    setSearchParams(next, { replace: true })
    if (decoded) openConfirm(decoded)
  }, [searchParams, setSearchParams, openConfirm])

  return (
    <ConfirmDaySnippetDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      payload={payload}
    />
  )
}
