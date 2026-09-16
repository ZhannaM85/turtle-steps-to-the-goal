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
    min-height: 258mm;
    padding: 0;
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
  .pdf-day-start { break-inside: avoid; }
  .pdf-day-header {
    font-size: 13pt;
    font-weight: 600;
    margin: 0 0 10pt 0;
    padding: 10pt 12pt;
    border: 1px solid #d6d3d1;
    border-left: 4pt solid #78716c;
    border-radius: 8pt;
    background: #f5f5f4;
    line-height: 1.3;
  }
  .pdf-day-section {
    margin: 0 0 8pt 0;
    padding: 0;
    border: 1px solid #e7e5e4;
    border-radius: 8pt;
    background: #f8fafc;
    overflow: hidden;
    break-inside: avoid;
  }
  .pdf-day-section-title {
    font-size: 10pt;
    font-weight: 600;
    margin: 0;
    padding: 6pt 10pt;
    border-bottom: 1px solid #e7e5e4;
    background: #fafaf9;
    color: #44403c;
  }
  .pdf-day-section:nth-of-type(1) .pdf-day-section-title { background: #eef2ff; color: #3730a3; }
  .pdf-day-section:nth-of-type(2) .pdf-day-section-title { background: #fff7ed; color: #9a3412; }
  .pdf-day-section:nth-of-type(3) .pdf-day-section-title { background: #ecfeff; color: #155e75; }
  .pdf-day-section:nth-of-type(4) .pdf-day-section-title { background: #fdf2f8; color: #9d174d; }
  .pdf-day-section-content {
    padding: 7pt 10pt 6pt;
  }
  .pdf-day-section-content .pdf-line:last-child,
  .pdf-day-section-content .pdf-day-item:last-child {
    margin-bottom: 0;
  }
  .pdf-day-section-content .pdf-line {
    margin: 0 0 3pt 0;
  }
  .pdf-day-section-water .pdf-day-section-content {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 10pt;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-line {
    grid-column: 1 / -1;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-day-item {
    margin-left: 0;
  }
  .pdf-day-item {
    margin: 3pt 0 0 8pt;
    padding-left: 8pt;
    border-left: 1.5pt solid #d6d3d1;
    font-size: 9.5pt;
    color: #57534e;
  }
  .pdf-footer {
    margin-top: auto;
    padding-top: 4pt;
    border-top: 1px solid #e7e5e4;
    font-size: 6.5pt;
    line-height: 1.25;
    color: #78716c;
  }
  .pdf-footer p { margin: 0 0 2pt 0; }
`
