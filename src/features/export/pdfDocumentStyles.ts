/**
 * #905 — print stylesheet for the HTML→PDF pipeline. Kept as a string so
 * the off-DOM document does not depend on the app's Tailwind runtime.
 * Calm typography / section cards; footer padding matches #892 clearance.
 */
export const PDF_DOCUMENT_CSS = `
  * { box-sizing: border-box; }
  .pdf-root {
    font-family: "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    color: #1c1917;
    font-size: 11pt;
    line-height: 1.45;
    background: #fff;
  }
  .pdf-page {
    width: 180mm;
    min-height: 0;
    padding: 0 0 18mm 0;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    break-after: page;
    background: #fff;
  }
  .pdf-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .pdf-page-body { flex: 1 1 auto; }
  .pdf-title {
    font-size: 18pt;
    font-weight: 600;
    margin: 0 0 4pt 0;
    letter-spacing: -0.02em;
  }
  .pdf-range {
    font-size: 10pt;
    color: #78716c;
    margin: 0 0 14pt 0;
  }
  .pdf-section {
    margin: 0 0 12pt 0;
    padding: 10pt 12pt;
    border: 1px solid #e7e5e4;
    border-radius: 8pt;
    background: #fafaf9;
  }
  .pdf-section-title {
    font-size: 12pt;
    font-weight: 600;
    margin: 0 0 6pt 0;
  }
  .pdf-muted { color: #78716c; font-size: 10pt; }
  .pdf-line { margin: 0 0 3pt 0; }
  .pdf-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .pdf-table th,
  .pdf-table td {
    border: 1px solid #d6d3d1;
    padding: 4pt 6pt;
    text-align: left;
  }
  .pdf-table th {
    background: #57534e;
    color: #fff;
    font-weight: 600;
  }
  .pdf-chart {
    width: 100%;
    height: 140px;
    display: block;
    margin-top: 4pt;
  }
  .pdf-day {
    margin: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .pdf-day-header {
    font-size: 13pt;
    font-weight: 600;
    margin: 0 0 6pt 0;
  }
  .pdf-day-section-title {
    font-size: 11pt;
    font-weight: 600;
    margin: 8pt 0 4pt 0;
  }
  .pdf-day-item {
    margin: 0 0 2pt 12pt;
    font-size: 9.5pt;
  }
  .pdf-footer {
    margin-top: 12pt;
    padding-top: 8pt;
    border-top: 1px solid #e7e5e4;
    font-size: 8pt;
    color: #78716c;
  }
  .pdf-footer p { margin: 0 0 4pt 0; }
`
