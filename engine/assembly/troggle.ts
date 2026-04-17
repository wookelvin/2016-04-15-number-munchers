import { GRID_WIDTH, GRID_HEIGHT, TROGGLE_COUNT } from './types'

// Troggle positions
export const troggleX: StaticArray<i32> = new StaticArray<i32>(TROGGLE_COUNT)
export const troggleY: StaticArray<i32> = new StaticArray<i32>(TROGGLE_COUNT)

// Direction: 0=right, 1=down, 2=left, 3=up
const troggleDir: StaticArray<i32> = new StaticArray<i32>(TROGGLE_COUNT)

// Per-troggle tick counter; troggles move every MOVE_INTERVAL ticks
const troggleTimer: StaticArray<i32> = new StaticArray<i32>(TROGGLE_COUNT)

// Troggles move every N game ticks (~60 fps → every 45 ticks ≈ 0.75 s)
const MOVE_INTERVAL: i32 = 45

/**
 * Place troggles at fixed starting positions (corners, away from muncher spawn 0,0).
 */
export function spawnTroggles(): void {
  troggleX[0] = GRID_WIDTH - 1
  troggleY[0] = 0
  troggleDir[0] = 1 // down

  troggleX[1] = 0
  troggleY[1] = GRID_HEIGHT - 1
  troggleDir[1] = 0 // right

  troggleX[2] = GRID_WIDTH - 1
  troggleY[2] = GRID_HEIGHT - 1
  troggleDir[2] = 3 // up

  // Stagger timers so they don't all move simultaneously
  for (let i = 0; i < TROGGLE_COUNT; i++) {
    troggleTimer[i] = i * 15
  }
}

/**
 * Returns true if any troggle occupies (x, y).
 */
export function troggleAt(x: i32, y: i32): boolean {
  for (let i = 0; i < TROGGLE_COUNT; i++) {
    if (troggleX[i] === x && troggleY[i] === y) return true
  }
  return false
}

/**
 * Move a single troggle one step in its direction, bouncing off walls.
 */
function stepTroggle(i: i32): void {
  const dir = troggleDir[i]
  let nx = troggleX[i]
  let ny = troggleY[i]

  if (dir === 0) nx = nx + 1
  else if (dir === 1) ny = ny + 1
  else if (dir === 2) nx = nx - 1
  else if (dir === 3) ny = ny - 1

  if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) {
    // Bounce: reverse direction
    troggleDir[i] = (dir + 2) % 4
    return
  }

  troggleX[i] = nx
  troggleY[i] = ny
}

/**
 * Advance all troggle timers/positions by one tick.
 * Returns true if any troggle is now on (mx, my) after movement.
 */
export function tickTroggles(mx: i32, my: i32): boolean {
  let collision = false
  for (let i = 0; i < TROGGLE_COUNT; i++) {
    troggleTimer[i] = troggleTimer[i] + 1
    if (troggleTimer[i] >= MOVE_INTERVAL) {
      troggleTimer[i] = 0
      stepTroggle(i)
    }
    if (troggleX[i] === mx && troggleY[i] === my) {
      collision = true
    }
  }
  return collision
}
