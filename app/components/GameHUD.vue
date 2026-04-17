<script setup lang="ts">
import { RULE_NAMES } from '~/composables/useGameEngine'

interface Props {
  score: number
  lives: number
  level: number
  rule: number
}

const props = defineProps<Props>()
</script>

<template>
  <div class="hud">
    <!-- Rule (left) -->
    <div class="hud-rule">
      <span class="hud-label">Rule</span>
      <span class="hud-rule-name">{{ RULE_NAMES[rule] ?? `Rule ${rule}` }}</span>
    </div>

    <!-- Stats (right) -->
    <div class="hud-stats">
      <div class="hud-stat">
        <span class="hud-label">Level</span>
        <span class="hud-value">{{ level }}</span>
      </div>
      <div class="hud-stat">
        <span class="hud-label">Lives</span>
        <span class="hud-value hud-lives">
          <span v-for="n in lives" :key="n" class="heart">♥</span>
          <span v-for="n in Math.max(0, 3 - lives)" :key="'e' + n" class="heart heart-empty">♥</span>
        </span>
      </div>
      <div class="hud-stat">
        <span class="hud-label">Score</span>
        <span class="hud-value">{{ score.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: linear-gradient(180deg, rgba(10, 11, 30, 0.95), rgba(10, 11, 30, 0.78));
  border-bottom: 1px solid rgba(127, 135, 196, 0.22);
  box-shadow: 0 1px 0 rgba(74, 222, 128, 0.18) inset, 0 8px 20px -8px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  z-index: 10;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  user-select: none;
}

.hud-label {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8b92b8;
  display: block;
  line-height: 1;
  margin-bottom: 3px;
}

.hud-rule {
  display: flex;
  flex-direction: column;
}

.hud-rule-name {
  font-size: 14px;
  font-weight: 700;
  color: #22d3ee;
  line-height: 1.2;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
}

.hud-stats {
  display: flex;
  gap: 20px;
  align-items: center;
}

.hud-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.hud-value {
  font-size: 13px;
  font-weight: 700;
  color: #e6e9f5;
  line-height: 1.2;
}

.hud-lives {
  display: flex;
  gap: 3px;
}

.heart {
  color: #ec4899;
  font-size: 13px;
  text-shadow: 0 0 8px rgba(236, 72, 153, 0.55);
}

.heart-empty {
  color: rgba(127, 135, 196, 0.22);
  text-shadow: none;
}

@media (max-width: 480px) {
  .hud {
    height: 42px;
    padding: 0 10px;
  }

  .hud-stats {
    gap: 12px;
  }

  .hud-rule-name {
    font-size: 12px;
  }

  .hud-value {
    font-size: 12px;
  }
}
</style>
