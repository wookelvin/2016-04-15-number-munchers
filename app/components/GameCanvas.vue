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
const difficultyOptions: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', desc: 'Slow troggles' },
  { value: 'normal', label: 'Normal', desc: 'Classic speed' },
  { value: 'hard', label: 'Hard', desc: 'Fast troggles' },
]
let tickAccum = 0 // fractional tick accumulator for easy mode

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
    const tickRate = difficulty.value === 'easy' ? 0.5 : difficulty.value === 'hard' ? 2 : 1
    tickAccum += tickRate
    while (tickAccum >= 1) {
      api.value.gameTick()
      tickAccum--
    }

    // Detect state transitions
    const wasmState = api.value.getGameState()
    if (wasmState !== prevWasmState) {
      if (wasmState === GAME_STATE_DEAD) {
        phase.value = 'dead'
        sound.playGameOver()
      } else if (wasmState === GAME_STATE_LEVEL_CLEAR) {
        phase.value = 'level-clear'
        sound.playLevelClear()
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
          <h1 class="overlay-title">Number<br>Munchers</h1>
          <p class="overlay-subtitle">Eat numbers that match the rule.<br>Avoid the Troggles.</p>

          <!-- Difficulty -->
          <div class="difficulty-group">
            <p class="difficulty-label">Difficulty</p>
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
          <div class="level-badge">Level {{ snapLevel }}</div>
          <h2 class="overlay-title small">Level Clear!</h2>
          <p class="overlay-score">+{{ 100 * snapLevel }} bonus points</p>
          <p class="overlay-next-rule">
            Next: <strong>{{ RULE_NAMES[(snapRule + 1) % RULE_NAMES.length] }}</strong>
          </p>
          <button class="play-btn" @click="doAdvanceLevel">
            Continue
          </button>
          <p class="overlay-hint">or press Enter</p>
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
          <p class="overlay-score">Score: {{ snapScore.toLocaleString() }}</p>
          <p class="overlay-level">Reached Level {{ snapLevel }}</p>
          <button class="play-btn danger" @click="doRestart">
            Play Again
          </button>
          <p class="overlay-hint">or press R</p>
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
  background: #0d1117;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  outline: none;
  cursor: crosshair;
}

/* On touch devices, leave bottom space for D-pad */
@media (pointer: coarse) {
  .game-canvas {
    height: calc(100% - 176px);
    margin-top: 48px; /* HUD height */
  }
}

.msg {
  position: absolute;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
}

.loading-msg { color: #8b949e; }
.error-msg { color: #f85149; }

/* ── Overlays ──────────────────────────────────────────────────────────────── */

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(6px);
  z-index: 20;
  padding: 16px;
}

.overlay-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 32px 28px;
  max-width: 340px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  font-family: 'Courier New', monospace;
}

.overlay-title {
  font-size: 2.4rem;
  font-weight: 900;
  color: #e6edf3;
  line-height: 1.1;
  margin: 0;
  letter-spacing: -0.02em;
}

.overlay-title.small {
  font-size: 1.8rem;
}

.overlay-subtitle {
  color: #8b949e;
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.overlay-score {
  font-size: 1.4rem;
  font-weight: bold;
  color: #3fb950;
  margin: 0;
}

.overlay-level, .overlay-next-rule {
  color: #8b949e;
  font-size: 0.85rem;
  margin: 0;
}

.overlay-next-rule strong {
  color: #388bfd;
}

.overlay-hint {
  color: #484f58;
  font-size: 0.75rem;
  margin: 0;
}

.level-badge {
  background: #1f6feb;
  color: #e6edf3;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 10px;
  border-radius: 20px;
}

.game-over-title {
  color: #f85149;
}

/* ── Difficulty selector ───────────────────────────────────────────────────── */

.difficulty-group {
  width: 100%;
}

.difficulty-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8b949e;
  margin: 0 0 8px;
}

.difficulty-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.diff-btn {
  flex: 1;
  padding: 8px 4px;
  border: 1px solid #30363d;
  border-radius: 8px;
  background: #0d1117;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: border-color 0.15s, background 0.15s;
}

.diff-btn.active {
  border-color: #388bfd;
  background: rgba(31, 111, 235, 0.12);
}

.diff-name {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: bold;
  color: #e6edf3;
}

.diff-desc {
  font-family: 'Courier New', monospace;
  font-size: 0.65rem;
  color: #8b949e;
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */

.play-btn {
  width: 100%;
  padding: 12px 20px;
  background: #238636;
  color: #e6edf3;
  border: none;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: opacity 0.15s, transform 0.1s;
}

.play-btn:hover { opacity: 0.88; }
.play-btn:active { transform: scale(0.97); }

.play-btn.danger {
  background: #b91c1c;
}

/* ── Controls hint ─────────────────────────────────────────────────────────── */

.controls-hint {
  color: #484f58;
  font-size: 0.7rem;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0;
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
