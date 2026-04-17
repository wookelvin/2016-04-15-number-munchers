<script setup lang="ts">
useSeoMeta({ title: 'Play — Number Munchers' })
</script>

<template>
  <!-- Full-viewport game page: no header/footer, no scroll -->
  <div class="game-page">
    <!-- Desktop: constrain to a centred square; Mobile: fill the screen -->
    <div class="game-frame">
      <GameCanvas />
    </div>
  </div>
</template>

<style scoped>
.game-page {
  position: fixed;
  inset: 0;
  background: #090c10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.game-frame {
  width: 100%;
  height: 100%;
}

/* On larger screens, constrain to a centred box with a reasonable aspect ratio */
@media (min-width: 640px) and (min-height: 500px) {
  .game-frame {
    /* Prefer tall portrait-ish ratio that fits the 8×8 grid nicely */
    aspect-ratio: 3 / 4;
    max-width: min(90vw, 560px);
    max-height: min(90vh, 750px);
    width: auto;
    height: auto;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 0 0 1px #30363d, 0 24px 64px rgba(0, 0, 0, 0.6);
  }
}
</style>
