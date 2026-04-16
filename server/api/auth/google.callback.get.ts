import { getDrizzle, upsertUser } from '../../db'

/**
 * GET /api/auth/google/callback
 * OAuth callback from Google. Exchanges auth code for tokens,
 * creates/updates user in database, and sets session.
 */
export default defineEventHandler(async (event) => {
  const { user } = await handleGoogleCallback(event)

  if (!user) {
    return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
  }

  // Upsert user in D1 database
  try {
    const db = getDrizzle(event.context.cloudflare.env.DB)
    await upsertUser(
      db,
      user.id,
      user.email,
      user.name,
    )
  } catch (error) {
    console.error('Failed to upsert user:', error)
    return sendError(event, createError({ statusCode: 500, statusMessage: 'Database error' }))
  }

  // Session is automatically set by nuxt-auth-utils,
  // but we can log the successful login
  console.log(`User logged in: ${user.email}`)

  // Redirect to home page
  return sendRedirect(event, '/')
})
