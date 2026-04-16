<script setup lang="ts">
const { loggedIn } = await useUserSession()
</script>

<template>
  <div>
    <div mb="8">
      <h2 text="2xl font-bold" mb="3">
        Welcome to Number Munchers
      </h2>
      <p text="muted-foreground" mb="6">
        A modernized take on the classic arcade game. Navigate the grid, eat numbers that match
        the rule, and avoid the Troggles. Fast, slick, and playable on any device.
      </p>

      <div grid="cols-1 sm:cols-2" gap="6">
        <!-- Game Start Card -->
        <div
          rounded="lg"
          border="border"
          bg="card"
          p="6"
          shadow="sm"
        >
          <h3 text="lg font-semibold" mb="2">
            Play Game
          </h3>
          <p text="sm muted-foreground" mb="4">
            {{ loggedIn ? 'Your scores will be saved to the leaderboard.' : 'Play as a guest or sign in to save scores.' }}
          </p>
          <NuxtLink
            to="/game"
            px="4"
            py="2"
            rounded="md"
            text="sm font-medium primary-foreground"
            bg="primary"
            hover="opacity-90"
            transition="opacity"
            inline-block
          >
            Start Game
          </NuxtLink>
        </div>

        <!-- Leaderboard Card -->
        <div
          rounded="lg"
          border="border"
          bg="card"
          p="6"
          shadow="sm"
        >
          <h3 text="lg font-semibold" mb="2">
            Leaderboard
          </h3>
          <p text="sm muted-foreground" mb="4">
            Check out the global top scores and compete with other players.
          </p>
          <NuxtLink
            to="/leaderboard"
            px="4"
            py="2"
            rounded="md"
            text="sm font-medium secondary-foreground"
            bg="secondary"
            hover="opacity-90"
            transition="opacity"
            inline-block
          >
            View Scores
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Game Info -->
    <div
      rounded="lg"
      border="border"
      bg="muted"
      p="6"
    >
      <h3 text="lg font-semibold" mb="4">
        How to Play
      </h3>
      <ul text="sm" space="y-2" ml="4">
        <li><strong>Desktop:</strong> Arrow keys to move, Space to eat</li>
        <li><strong>Mobile:</strong> Tap a cell to move and eat</li>
        <li><strong>Goal:</strong> Eat all numbers matching the rule</li>
        <li><strong>Avoid:</strong> Troggles that patrol the grid</li>
        <li><strong>Levels:</strong> Rules change each level, difficulty increases</li>
      </ul>
    </div>
  </div>
</template>
