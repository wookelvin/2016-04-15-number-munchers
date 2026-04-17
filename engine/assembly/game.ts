import {
  GRID_WIDTH,
  GRID_HEIGHT,
  GAME_STATE_INIT,
  GAME_STATE_PLAYING,
  GAME_STATE_DEAD,
  GAME_STATE_LEVEL_CLEAR,
} from './types'
import { matchesRule, getNextRule } from './rules'
import { nextRandom, randomRange } from './grid'
import { nextMuncherX, nextMuncherY } from './muncher'
import { spawnTroggles, tickTroggles, troggleAt } from './troggle'

// ── Game state ────────────────────────────────────────────────────────────────

export let gameStateVal: i32 = GAME_STATE_INIT
export let score: i32 = 0
export let lives: i32 = 3
export let level: i32 = 1
export let currentRule: i32 = 0
export let muncherX: i32 = 0
export let muncherY: i32 = 0

// Seeded RNG state
let rngSeed: u64 = 12345

// Grid buffers
export const gridNumbers: StaticArray<i32> =
  new StaticArray<i32>(GRID_WIDTH * GRID_HEIGHT)
export const gridEaten: StaticArray<boolean> =
  new StaticArray<boolean>(GRID_WIDTH * GRID_HEIGHT)

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellIdx(x: i32, y: i32): i32 {
  return y * GRID_WIDTH + x
}

function countCorrectRemaining(): i32 {
  let n: i32 = 0
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    if (!gridEaten[i] && matchesRule(gridNumbers[i], currentRule)) n++
  }
  return n
}

function rand(): i32 {
  rngSeed = nextRandom(rngSeed)
  return i32(rngSeed & 0x7fffffff)
}

function randRange(min: i32, max: i32): i32 {
  return randomRange(rngSeed, min, max)
}

function fillGrid(): void {
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    rngSeed = nextRandom(rngSeed)
    gridNumbers[i] = randRange(1, 99)
    gridEaten[i] = false
  }

  // Guarantee at least 8 correct cells so the level is always solvable
  let correct: i32 = 0
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    if (matchesRule(gridNumbers[i], currentRule)) correct++
  }

  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT && correct < 8; i++) {
    if (!matchesRule(gridNumbers[i], currentRule)) {
      if (currentRule === 0) { gridNumbers[i] = 3 * (i32(i % 9) + 1) }
      else if (currentRule === 1) {
        const factors: StaticArray<i32> = [1, 2, 3, 4, 6, 8, 12, 24]
        gridNumbers[i] = factors[i % 8]
      }
      else if (currentRule === 2) {
        const primes: StaticArray<i32> = [2, 3, 5, 7, 11, 13, 17, 19]
        gridNumbers[i] = primes[i % 8]
      }
      else if (currentRule === 3) { gridNumbers[i] = 51 + i32(i % 48) }
      else if (currentRule === 4) { gridNumbers[i] = 7 }
      correct++
    }
  }
}

function respawnMuncher(): void {
  muncherX = 0
  muncherY = 0
  // Ensure spawn cell is not occupied by a troggle (shift right if needed)
  if (troggleAt(0, 0)) {
    muncherX = 1
  }
}

function handleDeath(): void {
  lives--
  if (lives <= 0) {
    gameStateVal = GAME_STATE_DEAD
  } else {
    respawnMuncher()
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initGame(seed: i32, rule: i32): void {
  rngSeed = u64(seed) ^ 0xdeadbeef
  currentRule = rule
  score = 0
  lives = 3
  level = 1

  fillGrid()
  respawnMuncher()
  spawnTroggles()

  gameStateVal = GAME_STATE_PLAYING
}

/**
 * Called every animation frame (~60 fps).
 * Advances troggle timers and checks collision.
 */
export function gameTick(): void {
  if (gameStateVal !== GAME_STATE_PLAYING) return

  const collision = tickTroggles(muncherX, muncherY)
  if (collision) {
    handleDeath()
  }
}

/**
 * Move muncher. dir: 0=up, 1=right, 2=down, 3=left
 */
export function movePlayer(dir: i32): void {
  if (gameStateVal !== GAME_STATE_PLAYING) return

  let dx: i32 = 0
  let dy: i32 = 0
  if (dir === 0) dy = -1
  else if (dir === 1) dx = 1
  else if (dir === 2) dy = 1
  else if (dir === 3) dx = -1

  muncherX = nextMuncherX(muncherX, dx)
  muncherY = nextMuncherY(muncherY, dy)

  // Check if muncher walked into a troggle
  if (troggleAt(muncherX, muncherY)) {
    handleDeath()
  }
}

/**
 * Eat the cell the muncher currently occupies.
 */
export function eatAction(): void {
  if (gameStateVal !== GAME_STATE_PLAYING) return

  const idx = cellIdx(muncherX, muncherY)
  if (gridEaten[idx]) return

  const num = gridNumbers[idx]

  if (matchesRule(num, currentRule)) {
    gridEaten[idx] = true
    score += 10 * level

    if (countCorrectRemaining() <= 0) {
      score += 100 * level // level-clear bonus
      gameStateVal = GAME_STATE_LEVEL_CLEAR
    }
  } else {
    // Wrong number — lose a life
    score = score > 5 ? score - 5 : 0
    handleDeath()
  }
}

/**
 * Advance from LEVEL_CLEAR to the next level.
 */
export function advanceLevel(): void {
  if (gameStateVal !== GAME_STATE_LEVEL_CLEAR) return

  level++
  currentRule = getNextRule(currentRule)
  rngSeed = nextRandom(rngSeed)

  fillGrid()
  respawnMuncher()
  spawnTroggles()

  gameStateVal = GAME_STATE_PLAYING
}
