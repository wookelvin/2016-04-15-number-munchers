import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Google sub claim
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(current_timestamp)`),
})

export const scores = sqliteTable(
  'scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').references(() => users.id), // NULL for guest scores
    score: integer('score').notNull(),
    level: integer('level').notNull(),
    ruleSet: text('rule_set').notNull(), // e.g. "multiples", "primes"
    playedAt: integer('played_at', { mode: 'timestamp_ms' }).notNull().default(sql`(current_timestamp)`),
  },
  (table) => ({
    scoreIdx: index('idx_scores_score').on(table.score),
  }),
)

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert

export type Score = typeof scores.$inferSelect
export type InsertScore = typeof scores.$inferInsert
