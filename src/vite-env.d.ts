/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional USDA FoodData Central API key (#535). Falls back to DEMO_KEY. */
  readonly VITE_FDC_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Injected by vite.config.ts's `define` (#115) — the git commit SHA this
// bundle was built from in CI, or 'dev' locally.
declare const __APP_VERSION__: string
