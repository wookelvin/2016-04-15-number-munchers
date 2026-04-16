/**
 * GET /api/auth/google
 * Redirects to Google OAuth authorization URL.
 */
export default defineEventHandler(async (event) => {
  return await handleGoogleLogin(event)
})
