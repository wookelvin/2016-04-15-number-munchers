<script setup lang="ts">
useSeoMeta({ title: 'Number Munchers — WASM Arcade' })
const { loggedIn } = await useUserSession()
</script>

<template>
  <div class="space-y-10">
    <!-- Hero -->
    <section class="relative overflow-hidden arcade-card p-8 sm:p-12">
      <!-- Decorative glow dots -->
      <div class="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

      <div class="relative flex flex-col items-start gap-5 max-w-2xl">
        <span class="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-accent">
          <span class="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Now playing · v1
        </span>

        <h1 class="neon-wordmark text-2xl sm:text-4xl leading-[1.15]">
          NUMBER<br>
          <span class="neon-wordmark-accent">MUNCHERS</span>
        </h1>

        <p class="text-base sm:text-lg text-muted-foreground">
          A modern take on the classic educational arcade game. Eat numbers that match the rule,
          dodge the Troggles, and climb the leaderboard. Built with WebAssembly for a locked 60 FPS
          on desktop and mobile.
        </p>

        <div class="flex flex-wrap items-center gap-3 pt-2">
          <NuxtLink to="/game" class="btn-neon">
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
            Start Game
          </NuxtLink>
          <NuxtLink to="/leaderboard" class="btn-ghost">
            View Leaderboard
          </NuxtLink>
          <span v-if="!loggedIn" class="text-xs text-muted-foreground">
            Playing as guest — sign in to save scores.
          </span>
        </div>
      </div>
    </section>

    <!-- Feature cards -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="arcade-card p-5">
        <div class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M13 2L3 14h7l-1 8l10-12h-7l1-8Z" /></svg>
        </div>
        <h3 class="text-sm font-semibold mb-1">
          60 FPS WASM engine
        </h3>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Game logic compiled from AssemblyScript. Smooth on any device that can open a browser.
        </p>
      </div>

      <div class="arcade-card p-5">
        <div class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M17 10h-2v2h2v2h-2v2h2c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2zm-6 0H7c-1.1 0-2 .9-2 2v4h2v-2h2v2h2v-6zm-2 2H7v-2h2v2z" /></svg>
        </div>
        <h3 class="text-sm font-semibold mb-1">
          Plays everywhere
        </h3>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Keyboard on desktop, on-screen D-pad on touch. No install, no plugin.
        </p>
      </div>

      <div class="arcade-card p-5">
        <div class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 border border-destructive/30 text-destructive">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5L18.5 21L12 16.8L5.5 21L7.5 13.5L2 9h7z" /></svg>
        </div>
        <h3 class="text-sm font-semibold mb-1">
          Global leaderboard
        </h3>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Sign in with Google, save scores, and race friends across levels and rule sets.
        </p>
      </div>
    </section>

    <!-- How to play -->
    <section class="arcade-card p-6 sm:p-8">
      <div class="flex items-baseline justify-between mb-5">
        <h2 class="text-lg font-semibold">
          How to play
        </h2>
        <span class="text-[10px] uppercase tracking-widest text-muted-foreground">tutorial</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div class="flex gap-3">
          <kbd class="kbd">↑ ↓ ← →</kbd>
          <span class="text-muted-foreground">Move the Muncher around the grid.</span>
        </div>
        <div class="flex gap-3">
          <kbd class="kbd">Space</kbd>
          <span class="text-muted-foreground">Eat the number under the Muncher.</span>
        </div>
        <div class="flex gap-3">
          <kbd class="kbd">Tap</kbd>
          <span class="text-muted-foreground">On touch: tap a cell to move & eat.</span>
        </div>
        <div class="flex gap-3">
          <kbd class="kbd">R</kbd>
          <span class="text-muted-foreground">Restart after a game over.</span>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div class="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <span class="h-2 w-2 mt-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
          <p><span class="font-medium text-primary">Goal:</span> <span class="text-muted-foreground">eat every number matching the rule.</span></p>
        </div>
        <div class="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3">
          <span class="h-2 w-2 mt-1.5 rounded-full bg-destructive shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
          <p><span class="font-medium text-destructive">Avoid:</span> <span class="text-muted-foreground">Troggles patrolling the grid.</span></p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  padding: 0.15rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--foreground);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 0.4rem;
  white-space: nowrap;
}
</style>
