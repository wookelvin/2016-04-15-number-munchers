/**
 * useGameEngine — loads game.wasm, instantiates it, and exposes the full
 * JS↔WASM API.  Call `load()` once on mount; the returned `api` reactive ref
 * is null until the module is ready.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GameEngineExports {
  // Lifecycle
  initGame(seed: number, rule: number): void
  gameTick(): void
  movePlayer(dir: number): void // 0=up 1=right 2=down 3=left
  eatAction(): void
  advanceLevel(): void
  // State getters
  getGameState(): number
  getScore(): number
  getLives(): number
  getLevel(): number
  getCurrentRule(): number
  getMuncherX(): number
  getMuncherY(): number
  // Grid
  getGridWidth(): number
  getGridHeight(): number
  getCell(i: number): number     // 0 if eaten
  isCellEaten(i: number): number // 1 or 0
  getCellRaw(i: number): number  // number regardless of eaten state
  // Troggles
  getTroggleCount(): number
  getTroggleX(i: number): number
  getTroggleY(i: number): number
}

export const GAME_STATE_INIT = 0
export const GAME_STATE_PLAYING = 1
export const GAME_STATE_DEAD = 2
export const GAME_STATE_LEVEL_CLEAR = 3

export const DIR_UP = 0
export const DIR_RIGHT = 1
export const DIR_DOWN = 2
export const DIR_LEFT = 3

export const RULE_NAMES = [
  'Multiples of 3',
  'Factors of 24',
  'Prime Numbers',
  'Greater than 50',
  'Equals 7',
]

// ── Composable ────────────────────────────────────────────────────────────────

export function useGameEngine() {
  const api = shallowRef<GameEngineExports | null>(null)
  const error = ref<string | null>(null)

  async function load() {
    try {
      const response = await fetch('/game.wasm')
      if (!response.ok) throw new Error(`Failed to fetch game.wasm: ${response.status}`)
      const buffer = await response.arrayBuffer()
      const result = await WebAssembly.instantiate(buffer, {
        env: {
          abort: (msg: number, file: number, line: number, col: number) => {
            console.error('WASM abort:', msg, file, line, col)
          },
        },
      })
      // markRaw prevents Vue from wrapping the WASM exports object in a
      // reactive proxy, which would break the native function references.
      api.value = markRaw(result.instance.exports as unknown as GameEngineExports)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('[useGameEngine] load failed:', e)
    }
  }

  return { api, error, load }
}
