import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildProductionCsp,
  injectCspMeta,
  inlineScriptContents,
  sha256CspHash,
} from './vite.cspPlugin'

const indexHtml = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html'),
  'utf8',
)

describe('contentSecurityPolicyPlugin (#704)', () => {
  it('hashes the #17 pre-paint theme script from index.html', () => {
    const scripts = inlineScriptContents(indexHtml)
    expect(scripts.length).toBe(1)
    expect(scripts[0]).toContain('turtle-steps-theme')
    const csp = buildProductionCsp(indexHtml)
    expect(csp).toContain(`'sha256-${sha256CspHash(scripts[0]!)}'`)
    expect(csp).toContain("script-src 'self' 'unsafe-eval'")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })

  it('skips Vite HMR when a server context is present (inject is build-only)', () => {
    const withCsp = injectCspMeta(indexHtml)
    expect(withCsp).toContain('http-equiv="Content-Security-Policy"')
    expect(injectCspMeta(withCsp)).toBe(withCsp)
  })

  it('allows Open Food Facts and USDA fetches', () => {
    const csp = buildProductionCsp(indexHtml)
    expect(csp).toContain('https://world.openfoodfacts.org')
    expect(csp).toContain('https://api.nal.usda.gov')
  })
})
