/**
 * #939 — phone-readable overlay for the pdfDebug dump (#952 toggle).
 */
import {
  formatPdfDebugReport,
  PDF_DEBUG_OVERLAY_ID,
  type PdfDebugReport,
} from './pdfDebug'

function copyDebugText(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', 'true')
    area.style.position = 'fixed'
    area.style.left = '0'
    area.style.top = '0'
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
    } catch {
      // Overlay text remains selectable.
    }
    area.remove()
  })
}

/** Fixed, high-contrast, scrollable dump for iPhone (no desktop console). */
export function showPdfDebugOverlay(text: string): void {
  if (typeof document === 'undefined' || !document.body) return

  let root = document.getElementById(PDF_DEBUG_OVERLAY_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = PDF_DEBUG_OVERLAY_ID
    document.body.appendChild(root)
  }

  root.setAttribute('data-pdf-debug-overlay', 'true')
  Object.assign(root.style, {
    position: 'fixed',
    left: '8px',
    right: '8px',
    bottom: '8px',
    maxHeight: '48vh',
    zIndex: '2147483647',
    background: '#111',
    color: '#ffe566',
    border: '2px solid #ffe566',
    borderRadius: '10px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.35',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  })

  root.replaceChildren()

  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: '#000',
    color: '#fff',
    flex: '0 0 auto',
  })

  const title = document.createElement('strong')
  title.textContent = 'PDF debug #939'
  title.style.flex = '1 1 auto'
  header.appendChild(title)

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.textContent = 'Copy'
  Object.assign(copyBtn.style, {
    background: '#ffe566',
    color: '#111',
    border: '0',
    borderRadius: '6px',
    padding: '6px 10px',
    fontWeight: '700',
    fontSize: '13px',
  })
  copyBtn.addEventListener('click', () => copyDebugText(text))
  header.appendChild(copyBtn)

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = 'Close'
  Object.assign(closeBtn.style, {
    background: '#333',
    color: '#fff',
    border: '1px solid #ffe566',
    borderRadius: '6px',
    padding: '6px 10px',
    fontWeight: '700',
    fontSize: '13px',
  })
  closeBtn.addEventListener('click', () => root?.remove())
  header.appendChild(closeBtn)

  const body = document.createElement('pre')
  body.textContent = text
  Object.assign(body.style, {
    margin: '0',
    padding: '10px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'text',
    flex: '1 1 auto',
  })
  body.style.setProperty('-webkit-overflow-scrolling', 'touch')

  root.append(header, body)
}

export function publishPdfDebugReport(report: PdfDebugReport): string {
  const text = formatPdfDebugReport(report)
  console.log('[pdfDebug #939]', text)
  console.log('[pdfDebug #939 json]', report)
  showPdfDebugOverlay(text)
  return text
}
