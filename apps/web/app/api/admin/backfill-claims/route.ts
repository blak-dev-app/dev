import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { requireAdmin, requireRole } from "@/lib/require-admin"
import { resolveFleetIdByName } from "@/lib/fleet-resolve"

type AdminAuth = ReturnType<typeof adminAuth>
type AdminDb = ReturnType<typeof adminDb>

/**
 * Idempotent sync of Firebase Auth custom claims (role/fleetId/driverId) from
 * the current state of Firestore — see BLAK_IMPLEMENTATION_STATUS.md Phase 2.
 * Claims are always computed fresh from Firestore documents; a caller can
 * never pass in claim values for themselves or anyone else.
 *
 * Called automatically, once per signed-in session, by
 * components/admin/admin-shell.tsx and components/driver/driver-shell.tsx
 * whenever a user's current ID token has no `role` claim yet.
 *
 * ---------------------------------------------------------------------------
 * SECURITY (rewritten 2026-08-17 — see BLAK_IMPLEMENTATION_STATUS.md Phase 17)
 * ---------------------------------------------------------------------------
 * The previous version of this route ended with a fallback that promoted ANY
 * Auth account with no role claim and no application document to
 * `super_admin`. Its comment justified this as "today that only describes
 * manually-created Super Admin accounts" — true when written, but an
 * assumption about who can create accounts rather than an enforced check.
 * Since Email/Password and Google sign-in are both enabled on the project and
 * Firebase web API keys are public by design, anyone could self-register and
 * then call this endpoint (gated by requireAdmin, i.e. *any* signed-in user,
 * deliberately, because it bootstraps the first claims) to make themselves
 * super_admin. That was a complete privilege-escalation chain requiring no
 * existing credential.
 *
 * Four changes close it:
 *
 *  1. The blanket super_admin fallback is gone. Nothing mints super_admin
 *     implicitly any more.
 *
 *  2. Bootstrap is now allowlisted AND self-disabling. An account can only be
 *     promoted if its VERIFIED token email (decoded.email — from the signed
 *     token, never the request body) is listed in BOOTSTRAP_SUPER_ADMIN_EMAILS
 *     *and* no super_admin exists in the project yet. The second condition
 *     means the path can be used exactly once and is permanently closed
 *     afterwards, allowlist or not.
 *
 *  3. The default behaviour syncs ONLY the calling user's own claims. That is
 *     all AdminShell/DriverShell ever needed — they call this to self-heal the
 *     current session. Previously every call rewrote claims for every account
 *     in the project and read every doc in three collections, which any
 *     signed-in user could trigger at will.
 *
 *  4. The project-wide sweep still exists for genuine backfills, but now lives
 *     behind `?all=true` and requires an existing super_admin.
 *
 * The fleet_admin and driver paths are unchanged in substance: they derive
 * claims from documents that an admin created, and they still backfill
 * Driver.fleetId / Vehicle.fleetId from the denormalized fleetName string
 * (PRODUCTION_READY_TRACKER task #158). Historical rides/transactions are
 * still deliberately NOT backfilled — there is no reliable record of which
 * fleet a driver belonged to at the time of an old ride, and guessing would
 * fabricate history (spec sections 18-19, 42-43).
 */

/** True if any account in the project already holds the super_admin role. */
async function superAdminExists(auth: AdminAuth): Promise<boolean> {
  let pageToken: string | undefined
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      const claims = user.customClaims as Record<string, unknown> | undefined
      if (claims?.role === "super_admin") return true
    }
    pageToken = page.pageToken
  } while (pageToken)
  return false
}

/**
 * True if this specific account already holds the super_admin claim.
 *
 * Used to keep claim syncing non-destructive. See the guard at the top of
 * syncClaimsForUser for the reasoning.
 */
async function holdsSuperAdmin(auth: AdminAuth, uid: string): Promise<boolean> {
  try {
    const user = await auth.getUser(uid)
    return (user.customClaims as Record<string, unknown> | undefined)?.role === "super_admin"
  } catch {
    return false
  }
}

/**
 * Backfill Vehicle.fleetId for every vehicle owned by this driver that has a
 * driverId but no fleetId of its own. Returns how many were updated.
 */
async function backfillVehiclesForDriver(db: AdminDb, driverId: string, fleetId: string) {
  const snap = await db.collection("vehicles").where("driverId", "==", driverId).get()
  let updated = 0
  for (const doc of snap.docs) {
    if (doc.data().fleetId) continue
    await doc.ref.update({ fleetId })
    updated++
  }
  return updated
}

type SyncResult = {
  role: "super_admin" | "fleet_admin" | "driver" | null
  reason: string
  driverFleetIdBackfilled: number
  vehicleFleetIdBackfilled: number
}

/**
 * Recompute and write the claims for a single account, from Firestore only.
 * Returns what was applied so the caller can report it without guessing.
 */
async function syncClaimsForUser(
  auth: AdminAuth,
  db: AdminDb,
  uid: string,
  email: string | undefined,
  emailVerified: boolean
): Promise<SyncResult> {
  const result: SyncResult = {
    role: null,
    reason: "no linked application document",
    driverFleetIdBackfilled: 0,
    vehicleFleetIdBackfilled: 0,
  }

  // -------------------------------------------------------------------------
  // NEVER DERIVE A PRIVILEGED CLAIM AWAY (task #212).
  //
  // Roles here are *derived*: this function looks the account up in
  // driverApplications / fleetApplications and writes back whatever it finds.
  // Those collections accept unauthenticated writes from the public Join Us
  // form, by design. Without this guard, submitting a driver application using
  // an administrator's email address is enough to strip that administrator's
  // role the next time their session self-heals - no account, no credentials,
  // no access required. That is not hypothetical: it happened in this project
  // on 2026-08-18 and cost the only super_admin its role.
  //
  // PR #23 closed the injection point (the intake route now rejects admin
  // emails). This closes the mechanism itself, which is the part that has to
  // hold even when some future write path forgets to check. The rule is
  // one-directional: this function may GRANT a role, never REVOKE one. The
  // absence of an application document is not evidence that a role was
  // withdrawn - revocation is a deliberate act and belongs in its own
  // operation, not in a self-heal that runs on every sign-in.
  // -------------------------------------------------------------------------
  const priorClaims = (await auth.getUser(uid)).customClaims as
    | Record<string, unknown>
    | undefined
  const priorRole = typeof priorClaims?.role === "string" ? priorClaims.role : null

  if (priorRole === "super_admin") {
    result.role = "super_admin"
    result.reason =
      "existing super_admin claim left untouched - privileged claims are never derived away"
    return result
  }

  // 1. Fleet admin — the account is the authUid on a fleetApplications doc.
  const fleetSnap = await db.collection("fleetApplications").where("authUid", "==", uid).limit(1).get()
  const fleetDoc = fleetSnap.docs[0]
  if (fleetDoc) {
    await auth.setCustomUserClaims(uid, { role: "fleet_admin", fleetId: fleetDoc.id })
    result.role = "fleet_admin"
    result.reason = `linked to fleetApplications/${fleetDoc.id}`
    return result
  }

  // A fleet_admin whose fleetApplications document no longer carries their
  // authUid must not silently become a driver. Same rule as above, one rung
  // down the ladder.
  if (priorRole === "fleet_admin") {
    result.role = "fleet_admin"
    result.reason =
      "existing fleet_admin claim left untouched - no matching fleet document, but privileged claims are never derived away"
    return result
  }

  // 2. Driver — the account is the authUid on a driverApplications doc.
  const driverSnap = await db
    .collection("driverApplications")
    .where("authUid", "==", uid)
    .limit(1)
    .get()
  const driverDoc = driverSnap.docs[0]
  if (driverDoc) {
    const data = driverDoc.data()
    let fleetId: string | null = data.fleetId ?? null
    if (!fleetId) {
      fleetId = await resolveFleetIdByName(db, data.fleetName)
      if (fleetId) {
        await driverDoc.ref.update({ fleetId })
        result.driverFleetIdBackfilled = 1
      }
    }
    if (fleetId) {
      result.vehicleFleetIdBackfilled = await backfillVehiclesForDriver(db, driverDoc.id, fleetId)
    }
    await auth.setCustomUserClaims(uid, {
      role: "driver",
      driverId: driverDoc.id,
      ...(fleetId ? { fleetId } : {}),
    })
    result.role = "driver"
    result.reason = `linked to driverApplications/${driverDoc.id}`
    return result
  }

  // 3. Bootstrap super_admin — allowlisted, email-verified, and only while no
  //    super_admin exists anywhere in the project. Deliberately the last
  //    branch and deliberately narrow: this is the only path that can create
  //    the first privileged account, and it closes itself once used.
  const allowlist = (process.env.BOOTSTRAP_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const callerEmail = email?.toLowerCase()

  if (!callerEmail || !allowlist.includes(callerEmail)) {
    result.reason = "no linked application document; not an allowlisted bootstrap address"
    return result
  }
  if (!emailVerified) {
    result.reason = "allowlisted bootstrap address, but the account's email is not verified"
    return result
  }
  if (await superAdminExists(auth)) {
    result.reason = "bootstrap already used — a super_admin exists, so this path is closed"
    return result
  }

  await auth.setCustomUserClaims(uid, { role: "super_admin" })
  result.role = "super_admin"
  result.reason = "bootstrapped from BOOTSTRAP_SUPER_ADMIN_EMAILS (first super_admin)"
  return result
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const syncAll = url.searchParams.get("all") === "true"

    const db = adminDb()
    const auth = adminAuth()

    // ---------------------------------------------------------------------
    // Project-wide sweep. Genuine maintenance operation, so it requires an
    // existing super_admin rather than merely a signed-in user.
    // ---------------------------------------------------------------------
    if (syncAll) {
      const decoded = await requireRole(request, ["super_admin"])
      if (!decoded) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const summary = {
        fleetsClaimed: 0,
        driversClaimed: 0,
        driverFleetIdBackfilled: 0,
        vehicleFleetIdBackfilled: 0,
        errors: [] as string[],
      }

      const fleetSnap = await db.collection("fleetApplications").get()
      for (const doc of fleetSnap.docs) {
        const data = doc.data()
        if (!data.authUid) continue
        if (await holdsSuperAdmin(auth, data.authUid)) {
          summary.errors.push(`fleetApplications/${doc.id}: skipped - authUid holds super_admin`)
          continue
        }
        try {
          await auth.setCustomUserClaims(data.authUid, { role: "fleet_admin", fleetId: doc.id })
          summary.fleetsClaimed++
        } catch (e) {
          summary.errors.push(`fleetApplications/${doc.id}: ${String(e)}`)
        }
      }

      const driverSnap = await db.collection("driverApplications").get()
      for (const doc of driverSnap.docs) {
        const data = doc.data()
        let fleetId: string | null = data.fleetId ?? null
        if (!fleetId) {
          fleetId = await resolveFleetIdByName(db, data.fleetName)
          if (fleetId) {
            await doc.ref.update({ fleetId })
            summary.driverFleetIdBackfilled++
          }
        }
        if (!data.authUid) continue
        if (await holdsSuperAdmin(auth, data.authUid)) {
          summary.errors.push(`driverApplications/${doc.id}: skipped - authUid holds super_admin`)
          continue
        }
        try {
          await auth.setCustomUserClaims(data.authUid, {
            role: "driver",
            driverId: doc.id,
            ...(fleetId ? { fleetId } : {}),
          })
          summary.driversClaimed++
        } catch (e) {
          summary.errors.push(`driverApplications/${doc.id}: ${String(e)}`)
        }
      }

      const vehicleSnap = await db.collection("vehicles").get()
      for (const doc of vehicleSnap.docs) {
        const data = doc.data()
        if (data.fleetId || !data.driverId) continue
        const driverDoc = await db.collection("driverApplications").doc(data.driverId).get()
        const driverFleetId = driverDoc.exists ? driverDoc.data()?.fleetId : null
        if (driverFleetId) {
          await doc.ref.update({ fleetId: driverFleetId })
          summary.vehicleFleetIdBackfilled++
        }
      }

      return NextResponse.json({ ok: true, scope: "all", summary })
    }

    // ---------------------------------------------------------------------
    // Default: sync the caller's own claims only. Any signed-in user may do
    // this — it is the session self-heal the shells depend on — but it can
    // only ever affect the calling account, and only from Firestore state.
    // ---------------------------------------------------------------------
    const decoded = await requireAdmin(request)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await syncClaimsForUser(
      auth,
      db,
      decoded.uid,
      decoded.email,
      decoded.email_verified === true
    )

    return NextResponse.json({ ok: true, scope: "self", summary })
  } catch (error) {
    console.error("admin/backfill-claims POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
