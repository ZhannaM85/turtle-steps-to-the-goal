/**
 * #905 — mount an off-DOM HTML document and convert it to a PDF Blob via
 * html2pdf.js (html2canvas + jsPDF). Local-first: no server. Output is a
 * styled raster of browser-laid-out HTML/CSS — the trade-off that lets us
 * keep real CSS in a PWA/Capacitor app.
 */
export async function renderHtmlDocumentToPdfBlob(
  html: string,
): Promise<Blob> {
  // Vitest/jsdom has no usable canvas layout — return a minimal PDF so
  // callers can still assert a Blob without pulling in Playwright here.
  if (
    import.meta.env.MODE === 'test' ||
    typeof document === 'undefined' ||
    !document.body
  ) {
    return new Blob(['%PDF-1.4\n%html2pdf-stub\n'], {
      type: 'application/pdf',
    })
  }

  const host = document.createElement('div')
  host.setAttribute('data-pdf-render-root', 'true')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '210mm'
  host.style.background = '#fff'
  host.innerHTML = html
  document.body.appendChild(host)

  try {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf =
      // ESM / CJS interop
      (html2pdfModule as unknown as { default?: unknown }).default ??
      html2pdfModule

    type Html2PdfWorker = {
      set: (opts: unknown) => Html2PdfWorker
      from: (el: HTMLElement) => Html2PdfWorker
      outputPdf: (type: string) => Promise<Blob>
    }
    const worker = (html2pdf as unknown as () => Html2PdfWorker)()

    const blob = await worker
      .set({
        margin: [12, 12, 14, 12],
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(host)
      .outputPdf('blob')

    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('html2pdf produced an empty blob')
    }
    return blob.type
      ? blob
      : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' })
  } finally {
    host.remove()
  }
}
