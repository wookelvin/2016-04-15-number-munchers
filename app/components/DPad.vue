<script setup lang="ts">
import { DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT } from '~/composables/useGameEngine'

const emit = defineEmits<{
  move: [dir: number]
  eat: []
}>()

function press(dir: number) {
  emit('move', dir)
}
</script>

<template>
  <div class="dpad" aria-label="Directional controls">
    <!-- Up -->
    <button
      class="dpad-btn dpad-up"
      aria-label="Move up"
      @pointerdown.prevent="press(DIR_UP)"
    >
      ▲
    </button>

    <!-- Middle row: Left · Eat · Right -->
    <div class="dpad-row">
      <button
        class="dpad-btn dpad-left"
        aria-label="Move left"
        @pointerdown.prevent="press(DIR_LEFT)"
      >
        ◀
      </button>

      <button
        class="dpad-btn dpad-eat"
        aria-label="Eat"
        @pointerdown.prevent="emit('eat')"
      >
        ●
      </button>

      <button
        class="dpad-btn dpad-right"
        aria-label="Move right"
        @pointerdown.prevent="press(DIR_RIGHT)"
      >
        ▶
      </button>
    </div>

    <!-- Down -->
    <button
      class="dpad-btn dpad-down"
      aria-label="Move down"
      @pointerdown.prevent="press(DIR_DOWN)"
    >
      ▼
    </button>
  </div>
</template>

<style scoped>
.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.dpad-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dpad-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 10px;
  background: rgba(22, 27, 34, 0.9);
  color: #8b949e;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.08s, transform 0.08s, color 0.08s;
  border: 1px solid #30363d;
}

.dpad-btn:active {
  background: #21262d;
  transform: scale(0.92);
  color: #e6edf3;
}

.dpad-eat {
  background: rgba(31, 111, 235, 0.2);
  color: #388bfd;
  border-color: #388bfd;
  font-size: 22px;
}

.dpad-eat:active {
  background: rgba(31, 111, 235, 0.5);
  color: #e6edf3;
}

@media (max-width: 360px) {
  .dpad-btn {
    width: 44px;
    height: 44px;
    font-size: 15px;
  }
}
</style>
