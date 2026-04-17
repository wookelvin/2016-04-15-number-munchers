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
  background: rgba(13, 17, 23, 0.92);
  border-bottom: 1px solid #21262d;
  backdrop-filter: blur(4px);
  z-index: 10;
  font-family: 'Courier New', monospace;
  user-select: none;
}

.hud-label {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8b949e;
  display: block;
  line-height: 1;
  margin-bottom: 2px;
}

.hud-rule {
  display: flex;
  flex-direction: column;
}

.hud-rule-name {
  font-size: 14px;
  font-weight: bold;
  color: #388bfd;
  line-height: 1.2;
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
  font-weight: bold;
  color: #e6edf3;
  line-height: 1.2;
}

.hud-lives {
  display: flex;
  gap: 2px;
}

.heart {
  color: #f85149;
  font-size: 12px;
}

.heart-empty {
  color: #21262d;
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
