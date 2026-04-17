<script setup lang="ts">
const route = useRoute()
const { loggedIn, user, clear } = await useUserSession()

const handleSignOut = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  await clear()
}

// Game page renders full-viewport — hide the shell chrome there.
const isGamePage = computed(() => route.path.startsWith('/game'))
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background text-foreground">
    <NuxtRouteAnnouncer />

    <!-- Header / Navigation — hidden on the game page for full-viewport play. -->
    <header v-if="!isGamePage" class="relative border-b border-border/60 bg-card/60 backdrop-blur-md">
      <!-- Thin neon rule beneath the header, tying shell color to the Muncher. -->
      <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div class="mx-auto px-4 py-3 sm:py-4 max-w-7xl flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <!-- Pixel-Muncher favicon-style logo -->
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/40 text-primary shadow-[0_0_20px_-4px_rgba(74,222,128,0.5)] group-hover:bg-primary/25 transition-colors">
            <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18Zm0 2a7 7 0 0 0-6.32 10l6.32-3l6.32 3A7 7 0 0 0 12 5Zm3.5 5a1 1 0 1 1 0 2a1 1 0 0 1 0-2Z" />
            </svg>
          </span>
          <div class="flex flex-col leading-tight">
            <span class="neon-wordmark text-[11px] sm:text-xs">NUMBER<span class="neon-wordmark-accent"> MUNCHERS</span></span>
            <span class="text-[10px] sm:text-xs text-muted-foreground tracking-wide">WASM arcade · 60 FPS</span>
          </div>
        </NuxtLink>

        <!-- Auth + nav -->
        <div class="flex items-center gap-2 sm:gap-3">
          <NuxtLink
            to="/leaderboard"
            class="hidden sm:inline-flex btn-ghost text-sm"
            active-class="!border-accent/60 !text-accent"
          >
            Leaderboard
          </NuxtLink>

          <template v-if="loggedIn">
            <div class="hidden md:flex flex-col text-right text-xs">
              <span class="font-medium text-foreground">
                {{ user?.user?.name || 'Player' }}
              </span>
              <span class="text-muted-foreground">
                {{ user?.user?.email }}
              </span>
            </div>
            <button class="btn-ghost text-sm" @click="handleSignOut">
              Sign Out
            </button>
          </template>
          <template v-else>
            <a href="/api/auth/google" class="btn-neon">
              <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.67 4.4-5.35 4.4c-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.76 3.93 14.6 3 12 3C6.98 3 3 7 3 12s3.98 9 9 9c5.2 0 8.64-3.66 8.64-8.8c0-.6-.07-1.05-.15-1.1Z" />
              </svg>
              Sign in with Google
            </a>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content
         Keep as a flex-1 block so the game canvas can fill remaining height. -->
    <main
      :class="[
        'flex-1 w-full',
        isGamePage ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:py-12',
      ]"
    >
      <NuxtPage />
    </main>

    <!-- Footer -->
    <footer v-if="!isGamePage" class="mt-auto border-t border-border/60 bg-card/40 backdrop-blur-sm">
      <div class="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-muted-foreground">
        <p>&copy; 2026 Number Munchers · not affiliated with the original · built with Nuxt + WebAssembly</p>
      </div>
    </footer>
  </div>
</template>
