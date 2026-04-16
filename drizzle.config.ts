import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
} satisfies Config
