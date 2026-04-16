/**
 * POST /api/auth/logout
 * Sign out the current user.
 */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
