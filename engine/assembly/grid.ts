import { GRID_WIDTH, GRID_HEIGHT, MAX_NUMBER, GameState } from './types'

/**
 * Seeded linear congruential generator (LCG)
 */
export function seedRNG(seed: u64): u64 {
  return seed
}

export function nextRandom(seed: u64): u64 {
  // LCG parameters (from Numerical Recipes)
  const a: u64 = 1664525
  const c: u64 = 1013904223
  const m: u64 = 0xffffffff
  return (a * seed + c) % m
}

export function randomRange(seed: u64, min: i32, max: i32): i32 {
  const range = max - min + 1
  const random = i32((seed % u64(range)))
  return min + random
}

/**
 * Initialize grid with random numbers
 */
export function initializeGrid(state: GameState): void {
  let seed = state.seed

  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    seed = nextRandom(seed)
    const number = randomRange(seed, 1, MAX_NUMBER)
    state.gridNumbers[i] = number
    state.gridEaten[i] = false
  }

  state.seed = seed

  // Clear eaten grid
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    state.gridEaten[i] = false
  }
}

/**
 * Get cell index from x, y coordinates
 */
export function getCellIndex(x: i32, y: i32): i32 {
  return y * GRID_WIDTH + x
}

/**
 * Get number at position
 */
export function getNumber(state: GameState, x: i32, y: i32): i32 {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return -1
  }
  return state.gridNumbers[getCellIndex(x, y)]
}

/**
 * Mark cell as eaten
 */
export function eatCell(state: GameState, x: i32, y: i32): void {
  if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
    state.gridEaten[getCellIndex(x, y)] = true
  }
}

/**
 * Check if cell has been eaten
 */
export function isEaten(state: GameState, x: i32, y: i32): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return true
  }
  return state.gridEaten[getCellIndex(x, y)]
}

/**
 * Count eaten cells (for level clear detection)
 */
export function countEatenCells(state: GameState): i32 {
  let count: i32 = 0
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    if (state.gridEaten[i]) count++
  }
  return count
}
