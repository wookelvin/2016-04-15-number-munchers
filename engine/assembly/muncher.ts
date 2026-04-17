import { GRID_WIDTH, GRID_HEIGHT } from './types'

/**
 * Clamp a movement to grid bounds.
 * Returns the new coordinate if in bounds, otherwise the original.
 */
export function clampAxis(pos: i32, delta: i32, limit: i32): i32 {
  const np = pos + delta
  return np >= 0 && np < limit ? np : pos
}

/**
 * Compute new muncher X given direction delta.
 */
export function nextMuncherX(x: i32, dx: i32): i32 {
  return clampAxis(x, dx, GRID_WIDTH)
}

/**
 * Compute new muncher Y given direction delta.
 */
export function nextMuncherY(y: i32, dy: i32): i32 {
  return clampAxis(y, dy, GRID_HEIGHT)
}
