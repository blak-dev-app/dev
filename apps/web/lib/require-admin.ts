import { adminAuth } from "@/lib/firebase-admin"

/**
 * Verifies the Firebase ID token sent in the `Authorization: Bearer <token>`
 * header of an incoming API request. Returns the decoded token (with `uid`)
 * if valid, or `null` if the header is missing/malformed or the token fails
 * verification (expired, revoked, wrong project, etc.).
 *
 * NOTE: this only confirms the caller is a signed-in Firebase Auth user —
 * there is currently no custom role claim (super_admin / fleet_admin) to
 * check against, since role-based claims haven't been implemented yet (see
 * PRODUCTION_READY_TRACKER.md Phase 3, item 25). Any authenticated account
 * passes this check today. Tightening this to a real role check is tracked
 * as a follow-up.
 */
export async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return null
  try {
    return await adminAuth().verifyIdToken(token)
  } catch {
    return null
  }
}
