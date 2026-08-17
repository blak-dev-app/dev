import { adminAuth } from "@/lib/firebase-admin"

/**
 * Verifies the Firebase ID token sent in the `Authorization: Bearer <token>`
 * header of an incoming API request. Returns the decoded token (with `uid`)
 * if valid, or `null` if the header is missing/malformed or the token fails
 * verification (expired, revoked, wrong project, etc.).
 *
 * NOTE: this only confirms the caller is a signed-in Firebase Auth user.
 * Use requireRole() below when a route should also be restricted to a
 * specific role (super_admin / fleet_admin / driver) — see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 2 for the rollout of custom claims.
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

/**
 * Like requireAdmin(), but also checks the decoded token's custom `role`
 * claim against an allow-list. Returns the decoded token (decoded.role,
 * decoded.fleetId, decoded.driverId all available) if both the signature
 * and the role check pass, or null otherwise.
 *
 * Bootstrap note: accounts created before the role-claims system existed
 * won't have a `role` claim on an already-cached token. Callers of this
 * function are only reached after the requesting page has gone through
 * AdminShell/DriverShell's client-side self-heal (which calls
 * /api/admin/backfill-claims once for any signed-in user with no role
 * claim, then force-refreshes their token) — so by the time a privileged
 * action is triggered, the token should already carry a real role. If it
 * still doesn't, this correctly rejects the request rather than guessing.
 */
export async function requireRole(request: Request, allowedRoles: string[]) {
  const decoded = await requireAdmin(request)
  if (!decoded) return null
  const role = (decoded as Record<string, unknown>).role as string | undefined
  if (!role || !allowedRoles.includes(role)) return null
  return decoded
}
