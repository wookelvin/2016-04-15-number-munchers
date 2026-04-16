<script setup lang="ts">
const scores = ref([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/scores')
    if (!res.ok) throw new Error('Failed to fetch leaderboard')
    scores.value = await res.json()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h2 text="2xl font-bold" mb="6">
      Global Leaderboard
    </h2>

    <div v-if="loading" text="center" py="12">
      <p text="muted-foreground">
        Loading scores...
      </p>
    </div>

    <div
      v-else-if="error"
      rounded="lg"
      border="border-destructive"
      bg="destructive/10"
      p="4"
      text="destructive"
    >
      <p>{{ error }}</p>
    </div>

    <div v-else-if="scores.length === 0" text="center" py="12">
      <p text="muted-foreground">
        No scores yet. Be the first to play!
      </p>
    </div>

    <div v-else overflow="x-auto">
      <table w="full" text="sm">
        <thead border-b="border">
          <tr>
            <th
              text="left font-semibold"
              px="4"
              py="2"
            >
              Rank
            </th>
            <th
              text="left font-semibold"
              px="4"
              py="2"
            >
              Player
            </th>
            <th
              text="right font-semibold"
              px="4"
              py="2"
            >
              Score
            </th>
            <th
              text="right font-semibold"
              px="4"
              py="2"
            >
              Level
            </th>
            <th
              text="left font-semibold"
              px="4"
              py="2"
            >
              Rule Set
            </th>
          </tr>
        </thead>
        <tbody divide-y="divide-border">
          <tr
            v-for="(score, idx) in scores"
            :key="score.id"
            hover="bg-muted"
            transition="colors"
          >
            <td px="4" py="3" font="medium">
              {{ idx + 1 }}
            </td>
            <td px="4" py="3">
              {{ score.user?.displayName || score.user?.email || 'Guest' }}
            </td>
            <td
              px="4"
              py="3"
              text="right font-bold"
            >
              {{ score.score }}
            </td>
            <td px="4" py="3" text="right">
              {{ score.level }}
            </td>
            <td
              px="4"
              py="3"
              text="xs muted-foreground capitalize"
            >
              {{ score.ruleSet }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
table {
  border-collapse: collapse;
}
</style>
