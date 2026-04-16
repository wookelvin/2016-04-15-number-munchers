import { insertScore } from '~/server/db'

/**
 * POST /api/scores
 * Submit a score.
 * Body: { score: number, level: number, ruleSet: string }
 */
export default defineEventHandler(async (event) => {
  const { user } = await useUserSession(event)

  const body = await readBody(event)

  // Validate input
  if (!body.score || !body.level || !body.ruleSet) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: score, level, ruleSet',
    })
  }

  try {
    const db = getDrizzle(event.context.cloudflare.env.DB)
    const score = await insertScore(db, {
      userId: user?.id,
      score: body.score,
      level: body.level,
      ruleSet: body.ruleSet,
    })
    return score
  } catch (error) {
    console.error('Failed to insert score:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save score' })
  }
})
