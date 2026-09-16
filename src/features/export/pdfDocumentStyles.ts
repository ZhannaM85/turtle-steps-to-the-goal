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
    font-size: 9pt;
    line-height: 1.28;
    background: #fff;
  }
  .pdf-page {
    width: 180mm;
    /* Leave room for the footer within the renderer's 980px one-page cap. */
    min-height: 248mm;
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
  .pdf-summary-body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 10pt;
    align-content: start;
  }
  .pdf-summary-body > .pdf-title,
  .pdf-summary-body > .pdf-range,
  .pdf-summary-body > .pdf-section-wide {
    grid-column: 1 / -1;
  }
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
    min-width: 0;
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
    vertical-align: middle;
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
    margin: 0 0 6pt 0;
    padding: 6pt 9pt;
    border: 1px solid #d6d3d1;
    border-left: 4pt solid #78716c;
    border-radius: 8pt;
    background: #f5f5f4;
    line-height: 1.3;
    display: flex;
    align-items: center;
  }
  .pdf-day-header h2 { font-size: 11pt; font-weight: 600; line-height: 1.2; margin: 0; }
  .pdf-section .pdf-line { overflow-wrap: anywhere; }
  .pdf-day-section {
    margin: 0 0 3pt 0;
    padding: 0;
    border: 1px solid #e7e5e4;
    border-radius: 8pt;
    background: #f8fafc;
    overflow: hidden;
    break-inside: avoid;
  }
  .pdf-day-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6pt;
    font-size: 8.5pt;
    font-weight: 600;
    margin: 0;
    padding: 3pt 6pt;
    line-height: 1.2;
    border-bottom: 1px solid #e7e5e4;
    background: #fafaf9;
    color: #44403c;
  }
  .pdf-day-section-title-metrics { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1pt 7pt; font-size: 7.5pt; font-weight: 400; }
  .pdf-day-header-metric { display: inline-flex; align-items: center; gap: 2pt; white-space: nowrap; }
  .pdf-day-header-metric svg { width: 9pt; height: 9pt; flex: none; }
  .pdf-day-section:nth-of-type(1) .pdf-day-section-title { background: #eef2ff; color: #3730a3; }
  .pdf-day-section:nth-of-type(2) .pdf-day-section-title { background: #fff7ed; color: #9a3412; }
  .pdf-day-section:nth-of-type(3) .pdf-day-section-title { background: #ecfeff; color: #155e75; }
  .pdf-day-section:nth-of-type(4) .pdf-day-section-title { background: #fdf2f8; color: #9d174d; }
  .pdf-day-section-content {
    padding: 4pt 6pt;
  }
  .pdf-day-section-content .pdf-line:last-child,
  .pdf-day-section-content .pdf-day-item:last-child {
    margin-bottom: 0;
  }
  .pdf-day-section-content .pdf-line {
    margin: 0 0 1pt 0;
  }
  .pdf-day-section-metrics .pdf-day-section-content .pdf-line,
  .pdf-day-section-notes .pdf-day-section-content .pdf-line {
    font-size: 7pt;
    line-height: 1.18;
  }
  .pdf-day-section-food .pdf-day-section-content {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3pt;
  }
  .pdf-day-section-food .pdf-day-section-content > .pdf-line { grid-column: 1 / -1; }
  .pdf-meal-card {
    min-width: 0;
    padding: 3pt 4pt;
    border: 1px solid #e7e5e4;
    border-radius: 5pt;
    background: #fff;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .pdf-meal-card .pdf-line { font-weight: 600; font-size: 7.5pt; line-height: 1.18; }
  .pdf-meal-card .pdf-day-item {
    display: flow-root;
    margin: 1pt 0 0;
    padding-left: 0;
    border-left: 0;
    font-size: 7pt;
    line-height: 1.18;
  }
  .pdf-meal-card .pdf-day-item::before {
    content: "—";
    margin-right: 3pt;
    color: #a8a29e;
  }
  .pdf-day-section-water .pdf-day-section-content {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 6pt;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-line {
    grid-column: 1 / -1;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-day-item {
    margin-left: 0;
  }
  .pdf-day-item {
    margin: 2pt 0 0 6pt;
    padding-left: 6pt;
    border-left: 1.5pt solid #d6d3d1;
    font-size: 7.5pt;
    color: #57534e;
  }
  .pdf-footer {
    margin-top: auto;
    flex: none;
    padding-top: 4pt;
    border-top: 1px solid #e7e5e4;
    font-size: 6.5pt;
    line-height: 1.25;
    color: #78716c;
  }
  .pdf-footer p { margin: 0 0 2pt 0; }
`
