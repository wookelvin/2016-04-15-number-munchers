import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import type { D1Database } from '@cloudflare/workers-types'
import * as schema from './schema'

/**
 * Get Drizzle instance bound to D1 database.
 * Use this in server routes: const db = getDrizzle(event.context.cloudflare.env.DB)
 */
export function getDrizzle(database: D1Database) {
  return drizzle(database, { schema })
}

/**
 * Upsert a user (insert if new, update if exists).
 * Used during OAuth callback to ensure user is in the database.
 */
export async function upsertUser(
  db: ReturnType<typeof getDrizzle>,
  userId: string,
  email: string,
  displayName?: string,
) {
  // Check if user exists
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))

  if (existing.length > 0) {
    // Update display name if provided
    if (displayName) {
      await db
        .update(schema.users)
        .set({ displayName })
        .where(eq(schema.users.id, userId))
    }
    return existing[0]
  }

  // Insert new user
  await db.insert(schema.users).values({
    id: userId,
    email,
    displayName,
  })

  const newUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
  return newUser[0]
}

/**
 * Get user by ID.
 */
export async function getUser(
  db: ReturnType<typeof getDrizzle>,
  userId: string,
) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
  return result[0] || null
}

/**
 * Insert a score record.
 */
export async function insertScore(
  db: ReturnType<typeof getDrizzle>,
  data: {
    userId?: string
    score: number
    level: number
    ruleSet: string
  },
) {
  const result = await db.insert(schema.scores).values(data).returning()
  return result[0]
}

/**
 * Get top N scores (global leaderboard).
 * Optionally filter by rule set.
 */
export async function getLeaderboard(
  db: ReturnType<typeof getDrizzle>,
  options?: {
    limit?: number
    offset?: number
    ruleSet?: string
  },
) {
  const { limit = 100, offset = 0, ruleSet } = options || {}

  let query = db
    .select({
      id: schema.scores.id,
      score: schema.scores.score,
      level: schema.scores.level,
      ruleSet: schema.scores.ruleSet,
      playedAt: schema.scores.playedAt,
      user: {
        id: schema.users.id,
        displayName: schema.users.displayName,
        email: schema.users.email,
      },
    })
    .from(schema.scores)
    .leftJoin(schema.users, eq(schema.scores.userId, schema.users.id))

  // Apply filters
  if (ruleSet) {
    query = query.where(eq(schema.scores.ruleSet, ruleSet))
  }

  const results = await query
    .orderBy((t) => t.score)
    .limit(limit)
    .offset(offset)

  return results
}

/**
 * Get user's personal best score.
 */
export async function getUserBestScore(
  db: ReturnType<typeof getDrizzle>,
  userId: string,
) {
  const result = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.userId, userId))
    .orderBy((t) => t.score)
    .limit(1)

  return result[0] || null
}
