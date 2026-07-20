/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// WCAG 2.1 contrast ratio, computed straight from the CSS source so this
// test tracks src/index.css directly rather than a hand-copied snapshot of
// its values (issue #11 accessibility/QA pass; extended for #165's full
// 10-combination re-audit).

const AA_TEXT = 4.5
const AA_UI = 3.0

/** Linear-light RGB (0-1 each channel) — both color functions below
 * normalize into this shape so `relLuminance`/`contrast` don't need to
 * know which CSS color syntax a value came from. */
type LinearRgb = [number, number, number]

function srgbEotf(channel8bit: number): number {
  const c = channel8bit / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function hexToLinearRgb(hex: string): LinearRgb {
  const n = parseInt(hex.replace('#', ''), 16)
  return [
    srgbEotf((n >> 16) & 255),
    srgbEotf((n >> 8) & 255),
    srgbEotf(n & 255),
  ]
}

/** oklch(L C H) -> linear sRGB, via OKLab (Björn Ottosson's reference
 * matrices — the standard, widely-used conversion; see
 * https://bottosson.github.io/posts/oklab/). Needed because `--destructive`
 * and `--chart-1` are defined in oklch(), not hex, and #165 wants every
 * color token covered, not just the hex-valued ones the original #11 pass
 * happened to check. Returns values un-gamma-encoded (linear light) since
 * that's exactly what the WCAG luminance formula needs — no round trip
 * through 8-bit sRGB and back. */
function oklchToLinearRgb(l: number, c: number, hDeg: number): LinearRgb {
  const hRad = (hDeg * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3

  // Our actual tokens are safely in gamut; clamp defensively rather than
  // let a slightly-out-of-range value (e.g. -0.0001 from float error)
  // produce a nonsensical luminance.
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return [clamp(rLin), clamp(gLin), clamp(bLin)]
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i

function parseColor(raw: string): LinearRgb | null {
  if (/^#[0-9a-f]{6}$/i.test(raw)) return hexToLinearRgb(raw)
  const oklchMatch = OKLCH_RE.exec(raw)
  if (oklchMatch) {
    const [, l, c, h] = oklchMatch
    return oklchToLinearRgb(Number(l), Number(c), Number(h))
  }
  return null
}

function relLuminance([r, g, b]: LinearRgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(raw1: string, raw2: string): number {
  const c1 = parseColor(raw1)
  const c2 = parseColor(raw2)
  if (!c1 || !c2) {
    throw new Error(`Unparseable color value: ${!c1 ? raw1 : raw2}`)
  }
  const l1 = relLuminance(c1)
  const l2 = relLuminance(c2)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

interface ThemeBlock {
  selector: string
  props: Record<string, string>
}

function parseThemeBlocks(css: string): ThemeBlock[] {
  // Anchored to the start of a line (not just anywhere `.dark`/`:root`
  // appear) — #165 found this matters: index.css's own
  // `@custom-variant dark (&:is(.dark *));` line contains `.dark` mid-line,
  // which an unanchored match greedily swallowed everything up to the
  // *next* real `{` for (the actual bare `:root {}` rule), silently
  // merging them into one garbled, misnamed block. The original hex-only
  // version of this test never noticed because it iterated every parsed
  // block without caring what its selector string actually was; resolving
  // --destructive/--chart-1 by exact selector match (below) does care.
  const blockRegex = /^((?:\.dark|:root)[^{]*)\{([^}]*)\}/gm
  const blocks: ThemeBlock[] = []
  let match: RegExpExecArray | null
  while ((match = blockRegex.exec(css))) {
    const selector = match[1].trim()
    const body = match[2]
    const props: Record<string, string> = {}
    const propRegex = /--([a-z0-9-]+):\s*([^;]+);/g
    let propMatch: RegExpExecArray | null
    while ((propMatch = propRegex.exec(body))) {
      const value = propMatch[2].trim()
      // Keep anything this file's own color parser understands (hex or
      // oklch()) — #165 widened this from hex-only so --destructive and
      // --chart-1 (both oklch, previously skipped entirely) get checked
      // too, not just the hex-valued tokens #11's original pass covered.
      if (parseColor(value)) props[propMatch[1]] = value
    }
    blocks.push({ selector, props })
  }
  return blocks
}

const cssPath = resolve(process.cwd(), 'src/index.css')
const css = readFileSync(cssPath, 'utf-8')
const blocks = parseThemeBlocks(css).filter(
  (b) => b.props.background && b.props.foreground,
)

const CHART_SERIES_TOKENS = [
  'chart-weight',
  'chart-calories',
  'chart-protein',
  'chart-fat',
  'chart-carbs',
]

// #165: --destructive and --chart-1 are intentionally mood-invariant —
// declared once in the base :root/.dark blocks and inherited by every
// :root[data-mood='X'] block (real CSS cascade behavior, not redeclared
// per mood). Checking `props.destructive` directly only exercises the 2
// base blocks against Pond's own --card/--background, silently skipping
// the other 4 moods' card/background pairings entirely — exactly the kind
// of gap #165 was filed to close. Resolved here explicitly instead, so
// every mood's own card/background gets checked against the constant
// value it actually inherits at runtime.
const lightBase = blocks.find((b) => b.selector === ':root')
const darkBase = blocks.find((b) => b.selector.startsWith('.dark'))
if (!lightBase || !darkBase) {
  throw new Error('Could not find the base :root/.dark blocks to resolve inherited tokens from')
}

describe('theme contrast (WCAG AA)', () => {
  it('found at least one theme block to check (parser sanity)', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(10) // 5 moods x light/dark
  })

  it.each(blocks.map((b) => [b.selector, b] as const))(
    '%s meets WCAG AA',
    (_selector, block) => {
      const p = block.props
      const isDark = block.selector.includes('.dark')
      const inherited = isDark ? darkBase.props : lightBase.props

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
      // text-destructive renders real error-message body text (validation
      // errors, ClearAllDataSection, ExportSection, GoalScreen) — AA_TEXT,
      // not just the weaker AA_UI a purely-decorative use would need. Also
      // covers CalendarView's bg-destructive period-marker dot, since
      // AA_TEXT is the stricter bar.
      if (inherited.destructive) {
        expect(
          contrast(inherited.destructive, p.background),
        ).toBeGreaterThanOrEqual(AA_TEXT)
        if (p.card) {
          expect(
            contrast(inherited.destructive, p.card),
          ).toBeGreaterThanOrEqual(AA_TEXT)
        }
      }
      // Chart line/dot colors are graphical objects representing data
      // (WCAG 1.4.11 non-text contrast), not body text — AA_UI is the
      // right bar. Checked against --background directly since every
      // Dashboard chart renders straight on the page background, not
      // inside a --card surface.
      for (const token of CHART_SERIES_TOKENS) {
        if (p[token]) {
          expect(contrast(p[token], p.background)).toBeGreaterThanOrEqual(
            AA_UI,
          )
        }
      }
      // --chart-1, same mood-invariant shape as --destructive above — the
      // one generic chart slot actually drawn on (CustomChartView's Steps
      // series).
      if (inherited['chart-1']) {
        expect(
          contrast(inherited['chart-1'], p.background),
        ).toBeGreaterThanOrEqual(AA_UI)
      }
    },
  )
})
