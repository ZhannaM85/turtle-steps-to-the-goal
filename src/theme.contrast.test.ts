/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// WCAG 2.1 contrast ratio, computed straight from the CSS source so this
// test tracks src/index.css directly rather than a hand-copied snapshot of
// its values (issue #11 accessibility/QA pass).

const AA_TEXT = 4.5
const AA_UI = 3.0

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrast(hex1: string, hex2: string): number {
  const l1 = relLuminance(hexToRgb(hex1))
  const l2 = relLuminance(hexToRgb(hex2))
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

interface ThemeBlock {
  selector: string
  props: Record<string, string>
}

function parseThemeBlocks(css: string): ThemeBlock[] {
  const blockRegex = /((?:\.dark|:root)[^{]*)\{([^}]*)\}/g
  const blocks: ThemeBlock[] = []
  let match: RegExpExecArray | null
  while ((match = blockRegex.exec(css))) {
    const selector = match[1].trim()
    const body = match[2]
    const props: Record<string, string> = {}
    const propRegex = /--([a-z0-9-]+):\s*([^;]+);/g
    let propMatch: RegExpExecArray | null
    while ((propMatch = propRegex.exec(body))) {
      props[propMatch[1]] = propMatch[2].trim()
    }
    // Only keep hex-valued color tokens — this file also has oklch() values
    // (chart-1..5, sidebar, destructive) that this test doesn't check.
    const hexProps: Record<string, string> = {}
    for (const [key, value] of Object.entries(props)) {
      if (/^#[0-9a-f]{6}$/i.test(value)) hexProps[key] = value
    }
    blocks.push({ selector, props: hexProps })
  }
  return blocks
}

const cssPath = resolve(process.cwd(), 'src/index.css')
const css = readFileSync(cssPath, 'utf-8')
const blocks = parseThemeBlocks(css).filter(
  (b) => b.props.background && b.props.foreground,
)

describe('theme contrast (WCAG AA)', () => {
  it('found at least one theme block to check (parser sanity)', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(10) // 5 moods x light/dark
  })

  it.each(blocks.map((b) => [b.selector, b] as const))(
    '%s meets WCAG AA',
    (_selector, block) => {
      const p = block.props
      expect(contrast(p.foreground, p.background)).toBeGreaterThanOrEqual(
        AA_TEXT,
      )
      if (p['muted-foreground']) {
        expect(
          contrast(p['muted-foreground'], p.background),
        ).toBeGreaterThanOrEqual(AA_TEXT)
        if (p.card) {
          expect(
            contrast(p['muted-foreground'], p.card),
          ).toBeGreaterThanOrEqual(AA_TEXT)
        }
      }
      if (p.card) {
        expect(contrast(p.foreground, p.card)).toBeGreaterThanOrEqual(AA_TEXT)
      }
      if (p.primary && p['primary-foreground']) {
        expect(
          contrast(p['primary-foreground'], p.primary),
        ).toBeGreaterThanOrEqual(AA_TEXT)
        expect(contrast(p.primary, p.background)).toBeGreaterThanOrEqual(AA_UI)
      }
      if (p.input) {
        // --input (not --border) is the one that must be legible: Input
        // renders bg-transparent, so this border is the only visual cue
        // marking the field boundary (WCAG 1.4.11). --border stays softer
        // by design for purely decorative dividers (table rows, header line).
        expect(contrast(p.input, p.background)).toBeGreaterThanOrEqual(AA_UI)
      }
    },
  )
})
