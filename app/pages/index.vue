<script setup lang="ts">
const { loggedIn } = await useUserSession()
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-3">
        Welcome to Number Munchers
      </h2>
      <p class="text-muted-foreground mb-6">
        A modernized take on the classic arcade game. Navigate the grid, eat numbers that match
        the rule, and avoid the Troggles. Fast, slick, and playable on any device.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <!-- Game Start Card -->
        <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 class="text-lg font-semibold mb-2">
            Play Game
          </h3>
          <p class="text-sm text-muted-foreground mb-4">
            {{ loggedIn ? 'Your scores will be saved to the leaderboard.' : 'Play as a guest or sign in to save scores.' }}
          </p>
          <NuxtLink
            to="/game"
            class="inline-block px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
          >
            Start Game
          </NuxtLink>
        </div>

        <!-- Leaderboard Card -->
        <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 class="text-lg font-semibold mb-2">
            Leaderboard
          </h3>
          <p class="text-sm text-muted-foreground mb-4">
            Check out the global top scores and compete with other players.
          </p>
          <NuxtLink
            to="/leaderboard"
            class="inline-block px-4 py-2 rounded-md text-sm font-medium text-secondary-foreground bg-secondary hover:opacity-90 transition-opacity"
          >
            View Scores
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- How to Play -->
    <div class="rounded-lg border border-border bg-muted p-6">
      <h3 class="text-lg font-semibold mb-4">
        How to Play
      </h3>
      <ul class="text-sm space-y-2 ml-4 list-disc">
        <li><strong>Desktop:</strong> Arrow keys to move, Space to eat</li>
        <li><strong>Mobile:</strong> Tap a cell to move and eat</li>
        <li><strong>Goal:</strong> Eat all numbers matching the rule</li>
        <li><strong>Avoid:</strong> Troggles that patrol the grid</li>
        <li><strong>Levels:</strong> Rules change each level, difficulty increases</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>
