import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { requireRole } from "@/lib/require-admin"
import { MAX_BULK_ROWS, summarise, validateSheet, type RowVerdict } from "@/lib/bulk-drivers"

/**
 * Fleet Admin bulk driver registration (task #217).
 *
 * Two modes over the same payload:
 *
 *   mode: "dry-run"  validate everything, write nothing, return a per-row verdict
 *   mode: "commit"   re-validate everything from scratch, then write
 *
 * ---------------------------------------------------------------------------
 * WHY COMMIT RE-VALIDATES INSTEAD OF TRUSTING THE DRY RUN
 * ---------------------------------------------------------------------------
 * It would be faster to have the client send back "row 12 was approved for
 * creation" and just write it. That would also mean the client decides what
 * gets written, which is the whole class of bug this route exists to avoid. The
 * commit pass repeats every check — schema, privileged email, duplicates —
 * against the same raw rows. The dry run is a preview for a human, never an
 * authorisation token.
 *
 * A consequence worth knowing: the preview can go stale. If someone registers
 * one of these addresses between preview and confirm, the commit will skip that
 * row and the final count will be lower than the preview promised. The response
 * always reports what actually happened rather than what was predicted.
 *
 * ---------------------------------------------------------------------------
 * THE PRIVILEGED-EMAIL GUARD IS THE POINT OF THIS ROUTE
 * ---------------------------------------------------------------------------
 * On 2026-08-18 a single email field on a public form cost this platform its
 * Super Admin account (#212). Roles here are DERIVED: the claims sync looks an
 * account's email up in driverApplications and writes the matching role. So
 * creating a driver application against an administrator's address is enough to
 * demote them at the next sync. No credentials required.
 *
 * A spreadsheet is that same injection point with hundreds of rows behind it,
 * uploaded by fleet_admin — a less-trusted role than the one this protects. One
 * hostile or careless row in the middle of a legitimate 200-row roster would do
 * it, and nobody reviewing the preview would necessarily spot it.
 *
 * So every address is checked against Firebase Auth custom claims — the actual
 * source of authority — before anything is written. Batched via getUsers() so
 * the cost is one round trip per 100 rows rather than per row.
 *
 * ---------------------------------------------------------------------------
 * fleetId IS TAKEN FROM THE CALLER'S TOKEN, NEVER THE REQUEST BODY
 * ---------------------------------------------------------------------------
 * A fleet_admin uploading a roster may only ever create drivers inside their
 * own fleet, and the only trustworthy statement of which fleet that is comes
 * from the verified custom claim. If the body could name a fleet, any fleet
 * admin could inject drivers into a competitor's roster.
 *
 * super_admin may pass an explicit fleetId, because they legitimately act on
 * behalf of any fleet — but it is validated against Firestore rather than
 * trusted, and fleetName is read from the fleet document rather than accepted
 * from the client. That is the same rule that fixed the fabricated
 * `fleetName: "BLAK"` in the public intake route: a client never asserts a
 * relationship, it only ever references one.
 */

/** Firebase Auth getUsers() accepts at most 100 identifiers per call. */
const AUTH_LOOKUP_CHUNK = 100
/** Firestore "in" queries accept at most 30 values per query. */
const FIRESTORE_IN_CHUNK = 30
/** Firestore batched writes cap at 500 operations. */
const WRITE_BATCH_LIMIT = 500

const PROTECTED_ROLES = ["super_admin", "fleet_admin"]

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Emails that already belong to an account holding an elevated role.
 *
 * Deliberately fails CLOSED, unlike the equivalent check on the public signup
 * route. That route fails open so a Firebase outage cannot take down public
 * driver signup — an availability trade-off that makes sense for one
 * self-service application at a time. Here the calculus is reversed: this is a
 * bulk administrative action, it is not time-critical, and failing open would
 * mean a transient Auth error silently disables the guard for an entire
 * upload. An operator retrying in five minutes is a much better outcome than
 * hundreds of unchecked writes.
 */
async function privilegedEmails(emails: readonly string[]): Promise<Set<string>> {
  const found = new Set<string>()
  for (const group of chunk(emails, AUTH_LOOKUP_CHUNK)) {
    const result = await adminAuth().getUsers(group.map((email) => ({ email })))
    for (const user of result.users) {
      const role = (user.customClaims?.role ?? "") as string
      if (PROTECTED_ROLES.includes(role)) {
        for (const address of [user.email, ...(user.providerData ?? []).map((p) => p.email)]) {
          if (address) found.add(address.toLowerCase())
        }
      }
    }
  }
  return found
}

/** Emails that already have a driverApplications document, anywhere on the
 * platform — not just in this fleet. A driver already registered to another
 * fleet must not be silently duplicated into this one; that is a transfer, and
 * transfers are a separate deliberate action (#185). */
async function existingDriverEmails(emails: readonly string[]): Promise<Set<string>> {
  const found = new Set<string>()
  const db = adminDb()
  for (const group of chunk(emails, FIRESTORE_IN_CHUNK)) {
    const snap = await db.collection("driverApplications").where("email", "in", group).get()
    for (const doc of snap.docs) {
      const email = doc.get("email")
      if (typeof email === "string") found.add(email.toLowerCase())
    }
  }
  return found
}

export async function POST(request: Request) {
  try {
    const decoded = await requireRole(request, ["fleet_admin", "super_admin"])
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const claims = decoded as Record<string, unknown>
    const role = claims.role as string
    const body = await request.json()

    const mode = body?.mode === "commit" ? "commit" : "dry-run"
    const rows = body?.rows

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Expected `rows` to be an array of rows." }, { status: 400 })
    }
    // Guard before doing any work: MAX_BULK_ROWS is also enforced inside
    // validateSheet, but rejecting an oversized payload up front avoids
    // parsing something enormous just to refuse it.
    if (rows.length > MAX_BULK_ROWS + 1) {
      return NextResponse.json(
        { error: `Too many rows. The limit is ${MAX_BULK_ROWS} drivers per upload.` },
        { status: 400 }
      )
    }

    // --- Resolve the target fleet. Claim first; body only for super_admin. ---
    let fleetId: string | null = null
    if (role === "fleet_admin") {
      fleetId = typeof claims.fleetId === "string" ? claims.fleetId : null
      if (!fleetId) {
        return NextResponse.json(
          { error: "This account isn't linked to a fleet yet, so drivers can't be registered to it." },
          { status: 400 }
        )
      }
    } else {
      fleetId = typeof body?.fleetId === "string" && body.fleetId.trim() ? body.fleetId.trim() : null
      if (!fleetId) {
        return NextResponse.json(
          { error: "Super Admin must specify which fleet these drivers belong to." },
          { status: 400 }
        )
      }
    }

    const fleetSnap = await adminDb().collection("fleetApplications").doc(fleetId).get()
    if (!fleetSnap.exists) {
      return NextResponse.json({ error: "That fleet no longer exists." }, { status: 400 })
    }
    const fleetData = fleetSnap.data() ?? {}
    // Read the name from the fleet document. Never from the request.
    const fleetName = String(fleetData.fleetName || fleetData.businessName || "").trim()
    if (!fleetName) {
      return NextResponse.json(
        { error: "That fleet has no name on record, so drivers can't be attributed to it." },
        { status: 400 }
      )
    }

    // --- Pass 1: everything decidable from the file itself. ---
    const sheet = validateSheet(rows as string[][])
    if (sheet.fatal) {
      return NextResponse.json({ error: sheet.fatal }, { status: 400 })
    }

    let verdicts: RowVerdict[] = sheet.verdicts

    // --- Pass 2: the two checks that need Firebase. ---
    const candidateEmails = verdicts.filter((v) => v.outcome === "create").map((v) => v.email)

    if (candidateEmails.length > 0) {
      const [privileged, existing] = await Promise.all([
        privilegedEmails(candidateEmails),
        existingDriverEmails(candidateEmails),
      ])

      verdicts = verdicts.map((v) => {
        if (v.outcome !== "create") return v
        if (privileged.has(v.email)) {
          // Neutral wording on purpose. Saying "this belongs to an
          // administrator" would turn the importer into an oracle for
          // enumerating admin accounts, which a fleet_admin should not have.
          return {
            outcome: "reject" as const,
            rowNumber: v.rowNumber,
            email: v.email,
            fullName: v.fullName,
            reason: "This email address can't be used for a driver application.",
          }
        }
        if (existing.has(v.email)) {
          return {
            outcome: "skip" as const,
            rowNumber: v.rowNumber,
            email: v.email,
            fullName: v.fullName,
            reason: "Already registered on BLAK — skipped, not duplicated.",
          }
        }
        return v
      })
    }

    const summary = summarise(verdicts)
    // Strip the parsed payload before responding: the client only needs the
    // verdict to render the preview, and echoing the full record back is
    // needless PII on the wire.
    const wireVerdicts = verdicts.map((v) => ({
      rowNumber: v.rowNumber,
      outcome: v.outcome,
      email: v.email,
      fullName: v.fullName,
      reason: v.outcome === "create" ? undefined : v.reason,
    }))

    if (mode === "dry-run") {
      return NextResponse.json({ mode, fleetId, fleetName, summary, verdicts: wireVerdicts })
    }

    // --- Commit. ---
    const toCreate = verdicts.filter((v): v is Extract<RowVerdict, { outcome: "create" }> => v.outcome === "create")
    if (toCreate.length === 0) {
      return NextResponse.json({
        mode,
        fleetId,
        fleetName,
        summary,
        verdicts: wireVerdicts,
        created: 0,
        batchId: null,
      })
    }

    const db = adminDb()
    // Stamped on every document from this upload. Gives Super Admin a way to
    // see that 200 pending drivers arrived as one roster rather than 200
    // separate website applications, and gives us a handle to reverse a
    // mistaken import later. Provenance is cheap to record now and impossible
    // to reconstruct afterwards.
    const batchId = db.collection("driverApplications").doc().id
    const actorUid = typeof claims.uid === "string" ? claims.uid : String(decoded.uid ?? "")
    const actorEmail = typeof claims.email === "string" ? claims.email : null

    for (const group of chunk(toCreate, WRITE_BATCH_LIMIT)) {
      const batch = db.batch()
      for (const row of group) {
        const ref = db.collection("driverApplications").doc()
        batch.set(ref, {
          fullName: row.data.fullName,
          email: row.data.email,
          phone: row.data.phone,
          city: row.data.city,
          country: row.data.country,
          licenseNumber: row.data.licenseNumber,
          yearsExperience: row.data.yearsExperience,
          vehicleType: row.data.vehicleType,
          hasOwnVehicle: row.data.hasOwnVehicle,
          fleetId,
          fleetName,
          // Honest provenance. The public form writes "rideblak.com"; these
          // did not come from the website and must not claim to have.
          source: "Fleet bulk upload",
          registeredVia: "fleet-bulk",
          registeredByUid: actorUid,
          registeredByEmail: actorEmail,
          bulkBatchId: batchId,
          // Fleet-registered drivers still go through BLAK review. The fleet
          // asserts employment; it does not grant platform access.
          status: "Pending Review",
          documents: {},
          createdAt: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()
    }

    return NextResponse.json({
      mode,
      fleetId,
      fleetName,
      summary,
      verdicts: wireVerdicts,
      created: toCreate.length,
      batchId,
    })
  } catch (error) {
    console.error("fleet/drivers/bulk POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
