import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { requireAdmin } from "@/lib/require-admin"
import { resolveFleetIdByName } from "@/lib/fleet-resolve"

/**
 * One-time-per-account, idempotent sync of Firebase Auth custom claims
 * (role/fleetId/driverId) from the current state of Firestore, for every
 * account that predates the role-claims system — see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 2. Safe to call repeatedly: it only
 * (re)writes claims computed fresh from Firestore each time, and never
 * accepts caller-supplied claim values.
 *
 * Called automatically, once per signed-in session, by
 * components/admin/admin-shell.tsx and the Driver dashboard shell whenever
 * a user's current ID token has no `role` claim yet.
 *
 * Also backfills Driver.fleetId / Vehicle.fleetId on the Firestore
 * documents themselves (not just the Auth claim) by resolving the existing
 * denormalized fleetName string — see PRODUCTION_READY_TRACKER.md task
 * #158. Historical rides/transactions are deliberately NOT backfilled: there
 * is no reliable record of which fleet a driver belonged to at the time of
 * an old ride, and guessing would create fabricated-looking historical
 * data (spec sections 18-19, 42-43). New rides/transactions get a real
 * fleetId going forward instead, once that write path exists.
 *
 * Auth: gated by requireAdmin (any signed-in Firebase user), not
 * requireRole — deliberately, since this is the bootstrap tool that grants
 * the very first role claims and can't yet require one to run. It only
 * ever *writes* claims computed from existing Firestore data; a caller
 * cannot pass in arbitrary claims for themselves or anyone else.
 */
export async function POST(request: Request) {
  try {
    const decoded = await requireAdmin(request)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = adminDb()
    const auth = adminAuth()
    const summary = {
      fleetsClaimed: 0,
      driversClaimed: 0,
      driverFleetIdBackfilled: 0,
      vehicleFleetIdBackfilled: 0,
      superAdminFallback: 0,
      errors: [] as string[],
    }

    const claimedUids = new Set<string>()

    const fleetSnap = await db.collection("fleetApplications").get()
    for (const doc of fleetSnap.docs) {
      const data = doc.data()
      if (!data.authUid) continue
      try {
        await auth.setCustomUserClaims(data.authUid, { role: "fleet_admin", fleetId: doc.id })
        claimedUids.add(data.authUid)
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
      try {
        await auth.setCustomUserClaims(data.authUid, {
          role: "driver",
          driverId: doc.id,
          ...(fleetId ? { fleetId } : {}),
        })
        claimedUids.add(data.authUid)
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

    // Any other existing Auth account not linked to a driver/fleet
    // application doc predates both application flows entirely — today
    // that only describes manually-created Super Admin accounts. Flagged
    // explicitly in BLAK_IMPLEMENTATION_STATUS.md as an assumption to
    // revisit once passenger accounts exist.
    let pageToken: string | undefined
    do {
      const page = await auth.listUsers(1000, pageToken)
      for (const user of page.users) {
        if (claimedUids.has(user.uid)) continue
        if ((user.customClaims as Record<string, unknown> | undefined)?.role) continue
        try {
          await auth.setCustomUserClaims(user.uid, { role: "super_admin" })
          summary.superAdminFallback++
        } catch (e) {
          summary.errors.push(`auth user ${user.uid}: ${String(e)}`)
        }
      }
      pageToken = page.pageToken
    } while (pageToken)

    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error("admin/backfill-claims POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
