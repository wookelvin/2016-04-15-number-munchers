// Game constants
export const GRID_WIDTH: i32 = 8
export const GRID_HEIGHT: i32 = 8
export const MAX_NUMBER: i32 = 99
export const TROGGLE_COUNT: i32 = 3

// Game states
export const GAME_STATE_INIT: i32 = 0
export const GAME_STATE_PLAYING: i32 = 1
export const GAME_STATE_DEAD: i32 = 2
export const GAME_STATE_LEVEL_CLEAR: i32 = 3

// Rule types
export const RULE_MULTIPLES_OF_3: i32 = 0
export const RULE_FACTORS_OF_24: i32 = 1
export const RULE_PRIME_NUMBERS: i32 = 2
export const RULE_GREATER_THAN_50: i32 = 3
export const RULE_EQUALS_7: i32 = 4

export class Position {
  constructor(public x: i32, public y: i32) {}
}

export class GameState {
  gridNumbers: StaticArray<i32> = new StaticArray<i32>(GRID_WIDTH * GRID_HEIGHT)
  gridEaten: StaticArray<boolean> = new StaticArray<boolean>(GRID_WIDTH * GRID_HEIGHT)
  muncher: Position
  lives: i32
  score: i32
  level: i32
  currentRule: i32
  gameState: i32
  troggles: StaticArray<Position> = new StaticArray<Position>(TROGGLE_COUNT)
  seed: u64

  constructor() {
    this.muncher = new Position(0, 0)
    this.lives = 3
    this.score = 0
    this.level = 1
    this.currentRule = RULE_MULTIPLES_OF_3
    this.gameState = GAME_STATE_INIT
    this.seed = 12345
  }
}
