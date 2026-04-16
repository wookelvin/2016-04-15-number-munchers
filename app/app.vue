<script setup lang="ts">
const { loggedIn, user, clear } = await useUserSession()

const handleSignOut = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  await clear()
}
</script>

<template>
  <div
    min-h="screen"
    flex="col"
    bg="background"
    text="foreground"
  >
    <NuxtRouteAnnouncer />

    <!-- Header / Navigation -->
    <header
      border-b="border"
      bg="card"
      shadow="sm"
      sticky="top"
      z="10"
    >
      <div
        mx="auto"
        px="4"
        py="3"
        max-w="7xl"
        flex="between"
        items="center"
      >
        <div flex="col">
          <h1 text="lg font-bold">
            Number Munchers
          </h1>
          <p text="xs muted-foreground">
            WASM-powered arcade game
          </p>
        </div>

        <!-- Auth Section -->
        <div flex="row" gap="3" items="center">
          <div
            v-if="loggedIn"
            flex="row"
            gap="2"
            items="center"
          >
            <div flex="col" text="right sm">
              <p font="medium">
                {{ user?.user?.name || 'Player' }}
              </p>
              <p text="xs muted-foreground">
                {{ user?.user?.email }}
              </p>
            </div>
            <button
              px="3"
              py="1.5"
              rounded="md"
              text="sm font-medium secondary-foreground"
              bg="secondary"
              hover="opacity-90"
              transition="opacity"
              @click="handleSignOut"
            >
              Sign Out
            </button>
          </div>
          <div v-else>
            <a
              href="/api/auth/google"
              px="4"
              py="2"
              rounded="md"
              text="sm font-medium primary-foreground"
              bg="primary"
              hover="opacity-90"
              transition="opacity"
              inline-block
            >
              Sign In with Google
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      flex="1"
      mx="auto"
      w="full"
      max-w="7xl"
      px="4"
      py="8"
    >
      <NuxtPage />
    </main>

    <!-- Footer -->
    <footer
      border-t="border"
      bg="muted"
      text="muted-foreground sm"
      py="6"
      px="4"
      mt="auto"
    >
      <div mx="auto" max-w="7xl" text="center">
        <p>&copy; 2026 Number Munchers. Not affiliated with the original.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Utility class helpers if needed */
</style>
