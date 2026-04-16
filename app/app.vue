<script setup lang="ts">
const { loggedIn, user, clear } = await useUserSession()

const handleSignOut = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  await clear()
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background text-foreground">
    <NuxtRouteAnnouncer />

    <!-- Header / Navigation -->
    <header class="border-b border-border bg-card shadow-sm">
      <div class="mx-auto px-4 py-3 sm:py-4 max-w-7xl flex items-center justify-between">
        <div class="flex flex-col">
          <h1 class="text-lg font-bold leading-tight">
            Number Munchers
          </h1>
          <p class="text-xs text-muted-foreground">
            WASM-powered arcade game
          </p>
        </div>

        <!-- Auth Section -->
        <div class="flex items-center gap-3">
          <template v-if="loggedIn">
            <div class="hidden sm:flex flex-col text-right text-sm">
              <p class="font-medium">
                {{ user?.user?.name || 'Player' }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ user?.user?.email }}
              </p>
            </div>
            <button
              class="px-3 py-1.5 rounded-md text-sm font-medium text-secondary-foreground bg-secondary hover:opacity-90 transition-opacity"
              @click="handleSignOut"
            >
              Sign Out
            </button>
          </template>
          <template v-else>
            <a
              href="/api/auth/google"
              class="inline-block px-4 py-2 rounded-md text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
            >
              Sign In with Google
            </a>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content
         Note: keep this as a flex-1 block so the game canvas can fill remaining height
         with h-full on its own container — avoid using 100vh inside pages. -->
    <main class="flex-1 mx-auto w-full max-w-7xl px-4 py-8">
      <NuxtPage />
    </main>

    <!-- Footer -->
    <footer class="mt-auto border-t border-border bg-muted text-muted-foreground text-sm py-6 px-4">
      <div class="mx-auto max-w-7xl text-center">
        <p>&copy; 2026 Number Munchers. Not affiliated with the original.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Utility class helpers if needed */
</style>
