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
    <h2 class="text-2xl font-bold mb-6">
      Global Leaderboard
    </h2>

    <div v-if="loading" class="text-center py-12">
      <p class="text-muted-foreground">
        Loading scores...
      </p>
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
    >
      <p>{{ error }}</p>
    </div>

    <div v-else-if="scores.length === 0" class="text-center py-12">
      <p class="text-muted-foreground">
        No scores yet. Be the first to play!
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b">
          <tr>
            <th class="text-left font-semibold px-4 py-2">
              Rank
            </th>
            <th class="text-left font-semibold px-4 py-2">
              Player
            </th>
            <th class="text-right font-semibold px-4 py-2">
              Score
            </th>
            <th class="text-right font-semibold px-4 py-2">
              Level
            </th>
            <th class="text-left font-semibold px-4 py-2">
              Rule Set
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="(score, idx) in scores"
            :key="score.id"
            class="hover:bg-muted transition-colors"
          >
            <td class="px-4 py-3 font-medium">
              {{ idx + 1 }}
            </td>
            <td class="px-4 py-3">
              {{ score.user?.displayName || score.user?.email || 'Guest' }}
            </td>
            <td class="px-4 py-3 text-right font-bold">
              {{ score.score }}
            </td>
            <td class="px-4 py-3 text-right">
              {{ score.level }}
            </td>
            <td class="px-4 py-3 text-xs text-muted-foreground capitalize">
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
