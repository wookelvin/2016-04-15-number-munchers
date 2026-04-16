import { getLeaderboard } from '~/server/db'

/**
 * GET /api/scores
 * Returns the global leaderboard.
 * Query params: limit, offset, ruleset (optional)
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 100
  const offset = parseInt(query.offset as string) || 0
  const ruleSet = query.ruleset as string | undefined

  try {
    const db = getDrizzle(event.context.cloudflare.env.DB)
    const scores = await getLeaderboard(db, { limit, offset, ruleSet })
    return scores
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch leaderboard' })
  }
})
