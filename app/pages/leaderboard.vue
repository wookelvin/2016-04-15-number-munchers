<script setup lang="ts">
useSeoMeta({ title: 'Leaderboard — Number Munchers' })

interface Score {
  id: number | string
  score: number
  level: number
  ruleSet: string
  user?: { displayName?: string, email?: string } | null
}

const scores = ref<Score[]>([])
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

function rankColor(idx: number) {
  if (idx === 0) return 'text-[#fbbf24]' // gold
  if (idx === 1) return 'text-[#c7d2fe]' // silver
  if (idx === 2) return 'text-[#f59e0b]/80' // bronze
  return 'text-muted-foreground'
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <span class="text-[10px] uppercase tracking-widest text-accent">Global standings</span>
        <h1 class="neon-wordmark text-xl sm:text-2xl mt-1">
          LEADER<span class="neon-wordmark-accent">BOARD</span>
        </h1>
      </div>
      <NuxtLink to="/game" class="btn-neon">
        <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
        Challenge the top
      </NuxtLink>
    </header>

    <div v-if="loading" class="arcade-card p-12 text-center text-muted-foreground">
      <div class="inline-block h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-3" />
      <p>Loading scores…</p>
    </div>

    <div
      v-else-if="error"
      class="arcade-card border-destructive/40 p-4"
    >
      <p class="text-destructive">
        {{ error }}
      </p>
    </div>

    <div v-else-if="scores.length === 0" class="arcade-card p-12 text-center">
      <p class="text-muted-foreground mb-3">
        No scores yet. Be the first on the board.
      </p>
      <NuxtLink to="/game" class="btn-neon">Start a run</NuxtLink>
    </div>

    <div v-else class="arcade-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th class="text-left font-semibold px-4 py-3">
                Rank
              </th>
              <th class="text-left font-semibold px-4 py-3">
                Player
              </th>
              <th class="text-right font-semibold px-4 py-3">
                Score
              </th>
              <th class="text-right font-semibold px-4 py-3 hidden sm:table-cell">
                Level
              </th>
              <th class="text-left font-semibold px-4 py-3 hidden sm:table-cell">
                Rule Set
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(score, idx) in scores"
              :key="score.id"
              class="transition-colors hover:bg-white/[0.03]"
              :class="idx === 0 ? 'bg-primary/[0.04]' : ''"
            >
              <td class="px-4 py-3">
                <span class="font-mono font-bold" :class="rankColor(idx)">
                  #{{ idx + 1 }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="font-medium">
                  {{ score.user?.displayName || score.user?.email || 'Guest' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-mono font-bold text-primary">
                  {{ score.score.toLocaleString() }}
                </span>
              </td>
              <td class="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                {{ score.level }}
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <span class="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  {{ score.ruleSet }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
