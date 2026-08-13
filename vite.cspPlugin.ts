import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

/**
 * #704 — production-only Content-Security-Policy on `index.html`.
 *
 * Must not run on the Vite dev server: a script hash disables `'unsafe-inline'`
 * for scripts (CSP3), which would block Vite's HMR-injected inline modules.
 * The #17 pre-paint theme `<script>` stays in `index.html`; we hash whatever
 * inline scripts remain after the production transform so the hash cannot
 * drift from the file.
 *
 * `script-src` includes `'unsafe-eval'` for `vite-plugin-node-polyfills`'s
 * `vm` shim (`vm-browserify` calls `eval`), which `officecrypto-tool` needs
 * to decrypt password-protected MyFitnessPal .xlsx (#500). Inline XSS is
 * still blocked: hashes disable `'unsafe-inline'` for scripts (CSP3).
 *
 * `style-src` keeps `'unsafe-inline'` (no style hashes): React/`style={{}}`
 * and the #102 spinner `<style>` both need it, and a style hash would ignore
 * `'unsafe-inline'` the same way.
 */
export function sha256CspHash(content: string): string {
  return createHash('sha256').update(content).digest('base64')
}

export function inlineScriptContents(html: string): string[] {
  const contents: string[] = []
  // #706 — allow attributes/whitespace on the end tag (`</script foo="bar">`)
  // so CodeQL `js/bad-tag-filter` is satisfied; we only hash our own built HTML.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1] ?? ''
    if (/\bsrc\s*=/i.test(attrs)) continue
    contents.push(match[2] ?? '')
  }
  return contents
}

export function buildProductionCsp(html: string): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-eval'",
    ...inlineScriptContents(html).map((body) => `'sha256-${sha256CspHash(body)}'`),
  ].join(' ')
  return [
    "default-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://world.openfoodfacts.org https://api.nal.usda.gov",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob: mediastream:",
    "object-src 'none'",
    "frame-src 'none'",
  ].join('; ')
}

export function injectCspMeta(html: string): string {
  if (/http-equiv=["']Content-Security-Policy["']/i.test(html)) return html
  const meta = `    <meta http-equiv="Content-Security-Policy" content="${buildProductionCsp(html)}" />\n`
  if (html.includes('<meta charset="UTF-8" />')) {
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n${meta}`,
    )
  }
  return html.replace('<head>', `<head>\n${meta}`)
}

export function contentSecurityPolicyPlugin(): Plugin {
  return {
    name: 'content-security-policy-#704',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html
        return injectCspMeta(html)
      },
    },
  }
}
