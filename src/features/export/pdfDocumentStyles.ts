/**
 * #905 — print stylesheet for the HTML→PDF pipeline. Kept as a string so
 * the off-DOM document does not depend on the app's Tailwind runtime.
 * Calm typography / section cards; footer padding matches #892 clearance.
 *
 * #935 — html2canvas (especially iOS WebKit) mishandles CSS Grid, flex
 * `gap` / `space-between`, and asymmetric table padding. Use floats,
 * inline flow, and equal cell padding so the canvas matches the layout.
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
    padding-right: 9pt;
    padding-bottom: 9pt;
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
  .pdf-summary-body { overflow: hidden; }
  .pdf-title {
    font-size: 18pt;
    font-weight: 600;
    margin: 0 0 4pt 0;
    letter-spacing: -0.02em;
    clear: both;
  }
  .pdf-day-start > .pdf-title { margin-bottom: 12pt; }
  .pdf-range {
    font-size: 10pt;
    color: #78716c;
    margin: 0 0 14pt 0;
    clear: both;
  }
  .pdf-section {
    float: left;
    width: 48%;
    margin: 0 2% 12pt 0;
    padding: 10pt 12pt;
    border: 1px solid #e7e5e4;
    border-radius: 8pt;
    background: #fafaf9;
  }
  .pdf-summary-left { clear: left; }
  .pdf-summary-right {
    float: right;
    clear: right;
    margin-right: 0;
  }
  .pdf-summary-body > .pdf-section-wide {
    float: none;
    clear: both;
    width: 100%;
    margin-right: 0;
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
    padding: 0 6pt 8pt;
    text-align: left;
    vertical-align: middle;
    line-height: 1.2;
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
    /* html2canvas paints this heading below the CSS line-box center. */
    padding: 1pt 9pt 11pt;
    border: 1px solid #d6d3d1;
    border-left: 4pt solid #78716c;
    border-radius: 8pt;
    background: #f5f5f4;
    line-height: 1.2;
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
    font-size: 10.5pt;
    font-weight: 600;
    margin: 0;
    padding: 1pt 6pt 11pt;
    line-height: 1.2;
    border-bottom: 1px solid #e7e5e4;
    background: #fafaf9;
    color: #44403c;
    overflow: hidden;
  }
  .pdf-day-section-title > span { line-height: 1.2; }
  .pdf-day-section-metrics .pdf-day-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pdf-day-section-title-metrics {
    display: inline-flex;
    align-items: baseline;
    gap: 7pt;
    white-space: nowrap;
    font-size: 7.5pt;
    font-weight: 400;
    line-height: 1.2;
  }
  .pdf-day-section-title-lead { display: inline; }
  .pdf-day-section-water-total { font-weight: 400; padding-left: 4pt; }
  .pdf-day-header-metric {
    display: inline;
    white-space: nowrap;
    line-height: 1.2;
  }
  .pdf-day-header-metric svg {
    display: inline-block;
    width: 9pt;
    height: 9pt;
    vertical-align: -1.5pt;
    transform: translateY(1pt);
    margin-right: 2pt;
  }
  .pdf-day-section:nth-of-type(1) .pdf-day-section-title { background: #eef2ff; color: #3730a3; }
  .pdf-day-section:nth-of-type(2) .pdf-day-section-title { background: #fff7ed; color: #9a3412; }
  .pdf-day-section:nth-of-type(3) .pdf-day-section-title { background: #ecfeff; color: #155e75; }
  .pdf-day-section:nth-of-type(4) .pdf-day-section-title { background: #fdf2f8; color: #9d174d; }
  .pdf-day-section-content {
    padding: 4pt 6pt;
    overflow: hidden;
  }
  .pdf-day-section-content .pdf-line:last-child,
  .pdf-day-section-content .pdf-day-item:last-child {
    margin-bottom: 0;
  }
  .pdf-day-section-content .pdf-line {
    margin: 0 0 1pt 0;
  }
  .pdf-day-section-metrics .pdf-day-section-content,
  .pdf-day-section-water .pdf-day-section-content,
  .pdf-day-section-notes .pdf-day-section-content {
    padding-left: 9pt;
    padding-bottom: 12pt;
  }
  .pdf-day-section-metrics .pdf-day-section-content .pdf-line,
  .pdf-day-section-notes .pdf-day-section-content .pdf-line {
    font-size: 9pt;
    line-height: 1.18;
  }
  .pdf-day-section-metrics .pdf-day-line-label { font-weight: 700; }
  .pdf-day-section-food .pdf-day-section-content > .pdf-line { clear: both; }
  .pdf-meal-card {
    float: left;
    width: 48.5%;
    margin: 0 1.5% 3pt 0;
    padding: 3pt 4pt;
    padding-left: 10pt;
    padding-bottom: 9pt;
    border: 1px solid #e7e5e4;
    border-radius: 5pt;
    background: #fff;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .pdf-meal-card .pdf-line { font-weight: 600; font-size: 9.5pt; line-height: 1.18; }
  .pdf-meal-card .pdf-day-item {
    display: block;
    margin: 1pt 0 0;
    padding-left: 0;
    border-left: 0;
    font-size: 9pt;
    line-height: 1.18;
  }
  .pdf-meal-card .pdf-line + .pdf-day-item { margin-top: 4pt; }
  .pdf-meal-card .pdf-day-item::before {
    content: "— ";
    color: #a8a29e;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-line {
    clear: both;
  }
  .pdf-day-section-water .pdf-day-section-content .pdf-day-item {
    float: left;
    width: 32%;
    margin: 0 1% 2pt 0;
    padding-left: 0;
    border-left: 0;
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
    padding-left: 9pt;
    padding-bottom: 9pt;
    border-top: 1px solid #e7e5e4;
    font-size: 6.5pt;
    line-height: 1.25;
    color: #78716c;
  }
  .pdf-footer p { margin: 0 0 2pt 0; }
  .pdf-footer .pdf-page-number {
    margin: 0;
    text-align: right;
    font-weight: 600;
  }
`
