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
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(29, 31, 61, 0.9), rgba(20, 22, 46, 0.9));
  color: #c7d2fe;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.08s, transform 0.08s, color 0.08s, box-shadow 0.08s;
  border: 1px solid rgba(127, 135, 196, 0.25);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 4px 10px -4px rgba(0, 0, 0, 0.6);
}

.dpad-btn:active {
  background: rgba(34, 211, 238, 0.18);
  border-color: rgba(34, 211, 238, 0.6);
  transform: scale(0.92);
  color: #e6e9f5;
  box-shadow: 0 0 18px -2px rgba(34, 211, 238, 0.55);
}

.dpad-eat {
  background: linear-gradient(180deg, rgba(74, 222, 128, 0.25), rgba(74, 222, 128, 0.12));
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.55);
  font-size: 22px;
  box-shadow: 0 0 16px -4px rgba(74, 222, 128, 0.5);
}

.dpad-eat:active {
  background: rgba(74, 222, 128, 0.5);
  color: #07200f;
  border-color: rgba(74, 222, 128, 0.9);
  box-shadow: 0 0 22px -2px rgba(74, 222, 128, 0.75);
}

@media (max-width: 360px) {
  .dpad-btn {
    width: 44px;
    height: 44px;
    font-size: 15px;
  }
}
</style>
