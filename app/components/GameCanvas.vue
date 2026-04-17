<script setup lang="ts">
import { useRafFn } from '@vueuse/core'
import {
  useGameEngine,
  GAME_STATE_PLAYING,
  GAME_STATE_DEAD,
  GAME_STATE_LEVEL_CLEAR,
  RULE_NAMES,
} from '~/composables/useGameEngine'
import { useInput } from '~/composables/useInput'
import { useRenderer } from '~/composables/useRenderer'
import { useSound } from '~/composables/useSound'

// ── Boot ─────────────────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { api, error, load } = useGameEngine()
const sound = useSound()

// ── Game phase ────────────────────────────────────────────────────────────────
// 'start'       — start screen (WASM not yet running)
// 'playing'     — active game
// 'dead'        — game over overlay
// 'level-clear' — level clear overlay

type Phase = 'start' | 'playing' | 'dead' | 'level-clear'
const phase = ref<Phase>('start')

// ── Difficulty ────────────────────────────────────────────────────────────────
// Controls how many gameTick() calls per RAF frame
// Easy = 0.5 (every other frame), Normal = 1, Hard = 2
type Difficulty = 'easy' | 'normal' | 'hard'
const difficulty = ref<Difficulty>('normal')
const difficultyOptions: { value: Difficulty, label: string, desc: string }[] = [
  { value: 'easy', label: 'Easy', desc: 'Slow troggles' },
  { value: 'normal', label: 'Normal', desc: 'Classic speed' },
  { value: 'hard', label: 'Hard', desc: 'Fast troggles' },
]
let tickAccum = 0 // fractional tick accumulator for easy mode

// Death-animation sequencing: freeze ticks briefly on life loss; delay the
// Game Over overlay so the on-canvas death animation can play first.
let prevLivesLocal = -1
let tickFreezeUntil = 0
const DEATH_FREEZE_MS = 850
const FINAL_DEATH_OVERLAY_DELAY_MS = 1500

// ── Reactive state snapshot (synced each RAF frame) ──────────────────────────

const snapScore = ref(0)
const snapLives = ref(3)
const snapLevel = ref(1)
const snapRule = ref(0)
const snapState = ref(0)

let prevWasmState = -1

function syncSnapshot() {
  if (!api.value) return
  snapScore.value = api.value.getScore()
  snapLives.value = api.value.getLives()
  snapLevel.value = api.value.getLevel()
  snapRule.value = api.value.getCurrentRule()
  snapState.value = api.value.getGameState()
}

// ── Touch detection ───────────────────────────────────────────────────────────

const isTouchDevice = ref(false)
onMounted(() => {
  isTouchDevice.value = navigator.maxTouchPoints > 0
})

// ── Renderer + Input ──────────────────────────────────────────────────────────

let renderer: ReturnType<typeof useRenderer> | null = null
let input: ReturnType<typeof useInput> | null = null

watchEffect(() => {
  if (!api.value || !canvasRef.value) return
  input?.detach()
  input = useInput({
    canvas: canvasRef.value,
    gridWidth: api.value.getGridWidth(),
    gridHeight: api.value.getGridHeight(),
    onMove: handleMove,
    onEat: handleEat,
    onCellClick: handleCellClick,
  })
  input.attach()
})

// ── Game actions ──────────────────────────────────────────────────────────────

function handleMove(dir: number) {
  if (!api.value || phase.value !== 'playing') return
  api.value.movePlayer(dir)
  sound.playMove()
}

function handleEat() {
  if (!api.value) return
  if (phase.value === 'playing') {
    const prevScore = api.value.getScore()
    const prevLives = api.value.getLives()
    api.value.eatAction()
    const newScore = api.value.getScore()
    const newLives = api.value.getLives()
    if (newScore > prevScore) {
      sound.playEat()
    } else if (newLives < prevLives) {
      sound.playWrongEat()
    }
  } else if (phase.value === 'level-clear') {
    doAdvanceLevel()
  }
}

function handleCellClick(col: number, row: number) {
  if (!api.value || phase.value !== 'playing') return
  const mx = api.value.getMuncherX()
  const my = api.value.getMuncherY()
  if (col > mx) handleMove(1)
  else if (col < mx) handleMove(3)
  else if (row > my) handleMove(2)
  else if (row < my) handleMove(0)
  if (api.value.getMuncherX() === col && api.value.getMuncherY() === row) {
    handleEat()
  }
}

function doStartGame() {
  if (!api.value) return
  const seed = Date.now() & 0x7fffffff
  api.value.initGame(seed, 0)
  if (renderer) renderer.resetPositions(api.value)
  prevWasmState = GAME_STATE_PLAYING
  phase.value = 'playing'
  tickAccum = 0
  prevLivesLocal = api.value.getLives()
  tickFreezeUntil = 0
  resume()
}

function doAdvanceLevel() {
  if (!api.value) return
  api.value.advanceLevel()
  if (renderer) renderer.resetPositions(api.value)
  phase.value = 'playing'
}

function doRestart() {
  doStartGame()
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function handleKey(e: KeyboardEvent) {
  if (e.key === 'r' || e.key === 'R') {
    if (phase.value === 'dead' || phase.value === 'playing') doRestart()
  }
  if (e.key === 'Enter' || e.key === ' ') {
    if (phase.value === 'level-clear') doAdvanceLevel()
    else if (phase.value === 'dead') doRestart()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKey)
  await load()
  // Start RAF loop immediately so canvas renders (start screen visible)
  resume()
})

onUnmounted(() => {
  pause()
  input?.detach()
  window.removeEventListener('keydown', handleKey)
})

// ── RAF loop ──────────────────────────────────────────────────────────────────

const { pause, resume } = useRafFn(({ timestamp }) => {
  if (!api.value || !canvasRef.value) return

  if (!renderer) {
    renderer = useRenderer(canvasRef.value)
  }

  // Tick game logic only while playing
  if (phase.value === 'playing') {
    // Detect life loss → freeze ticks so the canvas death anim can play
    const livesNow = api.value.getLives()
    if (prevLivesLocal > 0 && livesNow < prevLivesLocal) {
      tickFreezeUntil = timestamp + DEATH_FREEZE_MS
    }
    prevLivesLocal = livesNow

    if (timestamp >= tickFreezeUntil) {
      const tickRate = difficulty.value === 'easy' ? 0.5 : difficulty.value === 'hard' ? 2 : 1
      tickAccum += tickRate
      while (tickAccum >= 1) {
        api.value.gameTick()
        tickAccum--
      }
    }

    // Detect state transitions
    const wasmState = api.value.getGameState()
    if (wasmState !== prevWasmState) {
      if (wasmState === GAME_STATE_DEAD) {
        sound.playGameOver()
        // Let the on-canvas death animation play before showing the overlay
        setTimeout(() => {
          if (api.value && api.value.getGameState() === GAME_STATE_DEAD) {
            phase.value = 'dead'
          }
        }, FINAL_DEATH_OVERLAY_DELAY_MS)
      } else if (wasmState === GAME_STATE_LEVEL_CLEAR) {
        sound.playLevelClear()
        tickFreezeUntil = timestamp + 1700 // pause enemy/muncher ticks during celebration
        setTimeout(() => {
          if (api.value && api.value.getGameState() === GAME_STATE_LEVEL_CLEAR) {
            phase.value = 'level-clear'
          }
        }, 1700)
      }
      prevWasmState = wasmState
    }
  }

  syncSnapshot()
  renderer.drawFrame(api.value, timestamp)
}, { immediate: false })
</script>

<template>
  <div class="game-wrap">
    <!-- Error -->
    <div v-if="error" class="msg error-msg">
      Failed to load game engine: {{ error }}
    </div>

    <!-- Loading -->
    <div v-else-if="!api" class="msg loading-msg">
      Loading engine…
    </div>

    <!-- Canvas (always mounted once api loads) -->
    <canvas
      v-if="api"
      ref="canvasRef"
      class="game-canvas"
      tabindex="0"
      aria-label="Number Munchers game canvas"
    />

    <!-- HUD (shown while playing, dead, or level-clear) -->
    <GameHUD
      v-if="api && phase !== 'start'"
      :score="snapScore"
      :lives="snapLives"
      :level="snapLevel"
      :rule="snapRule"
    />

    <!-- ── Start Screen ─────────────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="phase === 'start' && api" class="overlay start-overlay">
        <div class="overlay-card">
          <h1 class="overlay-title">
            Number<br>Munchers
          </h1>
          <p class="overlay-subtitle">
            Eat numbers that match the rule.<br>Avoid the Troggles.
          </p>

          <!-- Difficulty -->
          <div class="difficulty-group">
            <p class="difficulty-label">
              Difficulty
            </p>
            <div class="difficulty-btns">
              <button
                v-for="d in difficultyOptions"
                :key="d.value"
                class="diff-btn"
                :class="{ active: difficulty === d.value }"
                @click="difficulty = d.value"
              >
                <span class="diff-name">{{ d.label }}</span>
                <span class="diff-desc">{{ d.desc }}</span>
              </button>
            </div>
          </div>

          <button class="play-btn" @click="doStartGame">
            Play
          </button>

          <p class="controls-hint">
            <span>Arrow keys / WASD to move</span>
            <span>Space / Enter to eat</span>
          </p>
        </div>
      </div>
    </Transition>

    <!-- ── Level Clear Screen ───────────────────────────────────────────── -->
    <Transition name="pop">
      <div v-if="phase === 'level-clear'" class="overlay level-overlay">
        <div class="overlay-card">
          <div class="level-badge">
            Level {{ snapLevel }}
          </div>
          <h2 class="overlay-title small">
            Level Clear!
          </h2>
          <p class="overlay-score">
            +{{ 100 * snapLevel }} bonus points
          </p>
          <p class="overlay-next-rule">
            Next: <strong>{{ RULE_NAMES[(snapRule + 1) % RULE_NAMES.length] }}</strong>
          </p>
          <button class="play-btn" @click="doAdvanceLevel">
            Continue
          </button>
          <p class="overlay-hint">
            or press Enter
          </p>
        </div>
      </div>
    </Transition>

    <!-- ── Game Over Screen ─────────────────────────────────────────────── -->
    <Transition name="pop">
      <div v-if="phase === 'dead'" class="overlay dead-overlay">
        <div class="overlay-card">
          <h2 class="overlay-title small game-over-title">
            Game Over
          </h2>
          <p class="overlay-score">
            Score: {{ snapScore.toLocaleString() }}
          </p>
          <p class="overlay-level">
            Reached Level {{ snapLevel }}
          </p>
          <button class="play-btn danger" @click="doRestart">
            Play Again
          </button>
          <p class="overlay-hint">
            or press R
          </p>
        </div>
      </div>
    </Transition>

    <!-- ── D-Pad (touch devices) ────────────────────────────────────────── -->
    <div v-if="isTouchDevice && phase === 'playing'" class="dpad-wrap">
      <DPad @move="handleMove" @eat="handleEat" />
    </div>
  </div>
</template>

<style scoped>
.game-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0b1e;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.game-canvas {
  display: block;
  width: 100%;
  height: calc(100% - 48px);
  margin-top: 48px; /* HUD height */
  touch-action: none;
  outline: none;
  cursor: crosshair;
}

/* On touch devices, also leave bottom space for D-pad */
@media (pointer: coarse) {
  .game-canvas {
    height: calc(100% - 48px - 176px);
  }
}

@media (max-width: 480px) {
  .game-canvas {
    margin-top: 42px;
    height: calc(100% - 42px);
  }
}

@media (max-width: 480px) and (pointer: coarse) {
  .game-canvas {
    height: calc(100% - 42px - 176px);
  }
}

.msg {
  position: absolute;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
}

.loading-msg { color: #8b92b8; }
.error-msg { color: #ec4899; }

/* ── Overlays ──────────────────────────────────────────────────────────────── */

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse 60% 40% at 50% 30%, rgba(74, 222, 128, 0.12), transparent 70%),
    rgba(10, 11, 30, 0.88);
  backdrop-filter: blur(10px);
  z-index: 20;
  padding: 16px;
}

.overlay-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
    #14162e;
  border: 1px solid rgba(127, 135, 196, 0.28);
  border-radius: 18px;
  padding: 32px 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 0 0 1px rgba(74, 222, 128, 0.08),
    0 30px 60px -20px rgba(0, 0, 0, 0.7);
}

.overlay-title {
  font-family: 'Press Start 2P', system-ui, sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  color: #4ade80;
  line-height: 1.35;
  margin: 0;
  letter-spacing: 0.02em;
  text-shadow: 0 0 14px rgba(74, 222, 128, 0.5), 0 0 28px rgba(74, 222, 128, 0.25);
}

.overlay-title.small {
  font-size: 1rem;
}

.overlay-subtitle {
  color: #8b92b8;
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.overlay-score {
  font-size: 1.4rem;
  font-weight: 700;
  color: #4ade80;
  margin: 0;
  text-shadow: 0 0 14px rgba(74, 222, 128, 0.4);
}

.overlay-level, .overlay-next-rule {
  color: #8b92b8;
  font-size: 0.85rem;
  margin: 0;
}

.overlay-next-rule strong {
  color: #22d3ee;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.45);
}

.overlay-hint {
  color: rgba(139, 146, 184, 0.65);
  font-size: 0.72rem;
  margin: 0;
  letter-spacing: 0.05em;
}

.level-badge {
  background: linear-gradient(180deg, rgba(34, 211, 238, 0.25), rgba(34, 211, 238, 0.1));
  border: 1px solid rgba(34, 211, 238, 0.6);
  color: #22d3ee;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  padding: 4px 12px;
  border-radius: 999px;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.game-over-title {
  color: #ec4899;
  text-shadow: 0 0 14px rgba(236, 72, 153, 0.55), 0 0 28px rgba(236, 72, 153, 0.3);
}

/* ── Difficulty selector ───────────────────────────────────────────────────── */

.difficulty-group {
  width: 100%;
}

.difficulty-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #8b92b8;
  margin: 0 0 10px;
}

.difficulty-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.diff-btn {
  flex: 1;
  padding: 10px 4px;
  border: 1px solid rgba(127, 135, 196, 0.22);
  border-radius: 10px;
  background: rgba(10, 11, 30, 0.7);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.diff-btn:hover {
  border-color: rgba(127, 135, 196, 0.4);
}

.diff-btn.active {
  border-color: rgba(34, 211, 238, 0.7);
  background: rgba(34, 211, 238, 0.1);
  box-shadow: 0 0 18px -4px rgba(34, 211, 238, 0.5);
}

.diff-name {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: #e6e9f5;
  letter-spacing: 0.02em;
}

.diff-btn.active .diff-name {
  color: #22d3ee;
}

.diff-desc {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  color: #8b92b8;
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */

.play-btn {
  width: 100%;
  padding: 13px 20px;
  background: linear-gradient(180deg, #5ee891, #34c46c);
  color: #07200f;
  border: 1px solid rgba(74, 222, 128, 0.7);
  border-radius: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: filter 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow:
    0 0 0 1px rgba(74, 222, 128, 0.22),
    0 10px 28px -8px rgba(74, 222, 128, 0.55);
}

.play-btn:hover { filter: brightness(1.06); box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.35), 0 12px 32px -8px rgba(74, 222, 128, 0.7); }
.play-btn:active { transform: translateY(1px) scale(0.98); }

.play-btn.danger {
  background: linear-gradient(180deg, #f472b6, #c12b7a);
  color: #fdf2f8;
  border-color: rgba(236, 72, 153, 0.75);
  box-shadow:
    0 0 0 1px rgba(236, 72, 153, 0.22),
    0 10px 28px -8px rgba(236, 72, 153, 0.55);
}

.play-btn.danger:hover { box-shadow: 0 0 0 1px rgba(236, 72, 153, 0.35), 0 12px 32px -8px rgba(236, 72, 153, 0.7); }

/* ── Controls hint ─────────────────────────────────────────────────────────── */

.controls-hint {
  color: rgba(139, 146, 184, 0.7);
  font-size: 0.7rem;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0;
  letter-spacing: 0.02em;
}

/* ── D-Pad ─────────────────────────────────────────────────────────────────── */

.dpad-wrap {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
}

/* ── Transitions ───────────────────────────────────────────────────────────── */

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.pop-enter-from { opacity: 0; transform: scale(0.88); }
.pop-leave-to { opacity: 0; transform: scale(0.94); }
</style>
