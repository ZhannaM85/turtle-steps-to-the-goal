import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

/**
 * #742 — copy Tesseract worker/core next to the app origin so OCR never
 * fetches jsDelivr (blocked by `connect-src 'self'`). Language data is
 * committed under `public/tesseract/tessdata/`. Core/worker are generated
 * from node_modules on each build (gitignored).
 */
export function copyTesseractAssetsPlugin(): Plugin {
  function copyAssets(root: string) {
    const tesseractRoot = path.dirname(require.resolve('tesseract.js/package.json'))
    const coreRoot = path.dirname(
      require.resolve('tesseract.js-core/package.json'),
    )
    const destCore = path.join(root, 'public/tesseract/core')
    const destRoot = path.join(root, 'public/tesseract')
    mkdirSync(destCore, { recursive: true })
    mkdirSync(path.join(destRoot, 'tessdata'), { recursive: true })

    copyFileSync(
      path.join(tesseractRoot, 'dist/worker.min.js'),
      path.join(destRoot, 'worker.min.js'),
    )

    const coreFiles = [
      'tesseract-core-lstm.wasm.js',
      'tesseract-core-lstm.wasm',
      'tesseract-core-simd-lstm.wasm.js',
      'tesseract-core-simd-lstm.wasm',
      'tesseract-core-relaxedsimd-lstm.wasm.js',
      'tesseract-core-relaxedsimd-lstm.wasm',
    ]
    for (const file of coreFiles) {
      const from = path.join(coreRoot, file)
      if (!existsSync(from)) continue
      copyFileSync(from, path.join(destCore, file))
    }
  }

  return {
    name: 'copy-tesseract-assets-#742',
    buildStart() {
      copyAssets(process.cwd())
    },
  }
}
