/**
 * WASM API surface — everything exported from here is callable from JavaScript.
 *
 * State is owned by game.ts.  This file re-exports the public API and adds
 * thin accessors for arrays so JS can read grid/troggle data without needing
 * direct memory pointer arithmetic.
 */

export { initGame, gameTick, movePlayer, eatAction, advanceLevel } from './game'

import { gameStateVal, score, lives, level, currentRule, muncherX, muncherY } from './game'

// Wrap mutable module globals as functions so JS receives functions, not
// WebAssembly.Global objects (which is what re-exported variables become).
export function getGameState(): i32 { return gameStateVal }
export function getScore(): i32 { return score }
export function getLives(): i32 { return lives }
export function getLevel(): i32 { return level }
export function getCurrentRule(): i32 { return currentRule }
export function getMuncherX(): i32 { return muncherX }
export function getMuncherY(): i32 { return muncherY }

export {
  troggleX,
  troggleY,
} from './troggle'

import { gridNumbers, gridEaten } from './game'
import { troggleX, troggleY } from './troggle'
import { GRID_WIDTH, GRID_HEIGHT, TROGGLE_COUNT } from './types'

export function getGridWidth(): i32 { return GRID_WIDTH }
export function getGridHeight(): i32 { return GRID_HEIGHT }
export function getTroggleCount(): i32 { return TROGGLE_COUNT }

/** Return the number at grid index i (0 if eaten). */
export function getCell(i: i32): i32 {
  if (i < 0 || i >= GRID_WIDTH * GRID_HEIGHT) return 0
  return gridEaten[i] ? 0 : gridNumbers[i]
}

/** Return 1 if grid cell i has been eaten, 0 otherwise. */
export function isCellEaten(i: i32): i32 {
  if (i < 0 || i >= GRID_WIDTH * GRID_HEIGHT) return 1
  return gridEaten[i] ? 1 : 0
}

/** Raw number at grid cell i (regardless of eaten state — used by renderer for colour). */
export function getCellRaw(i: i32): i32 {
  if (i < 0 || i >= GRID_WIDTH * GRID_HEIGHT) return 0
  return gridNumbers[i]
}

export function getTroggleX(i: i32): i32 {
  if (i < 0 || i >= TROGGLE_COUNT) return -1
  return troggleX[i]
}

export function getTroggleY(i: i32): i32 {
  if (i < 0 || i >= TROGGLE_COUNT) return -1
  return troggleY[i]
}
