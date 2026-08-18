import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

/**
 * Roles that must never be reachable from a public form submission.
 *
 * See the "privileged email" section below for why this exists.
 */
const PROTECTED_ROLES = ["super_admin", "fleet_admin"]

/**
 * True if `email` belongs to an existing account that already holds an
 * elevated role. Fails OPEN (returns false) on lookup errors: a Firebase
 * outage must not take down public driver signup. That is a deliberate
 * trade-off — this check is a hardening layer, not the only defence.
 */
async function emailBelongsToPrivilegedAccount(email: string): Promise<boolean> {
  try {
    const user = await adminAuth().getUserByEmail(email)
    const role = (user.customClaims?.role ?? "") as string
    return PROTECTED_ROLES.includes(role)
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code === "auth/user-not-found") return false
    console.error("driver-applications: privileged-email check failed:", error)
    return false
  }
}

/**
 * Public driver application intake (Join Us → Drive with BLAK).
 *
 * ---------------------------------------------------------------------------
 * FIXED 2026-08-18 — fabricated fleet attribution
 * ---------------------------------------------------------------------------
 * This route previously wrote a hardcoded `fleetName: "BLAK"` onto every
 * single driver application, regardless of who applied or whether any such
 * fleet existed. The signup form never collected a fleet at all, so every
 * driver in the system was silently labelled as belonging to BLAK — a value
 * invented by this route rather than reported by the applicant. It then
 * propagated: lib/fleet-resolve.ts resolves Driver.fleetId from that string,
 * so the fabricated name was the seed for the real fleet linkage.
 *
 * The form now asks, and this route records what was actually chosen:
 *
 *  - `fleetId` is optional. Omitted / "independent" means the applicant is an
 *    independent driver, and NEITHER fleetId nor fleetName is written. Driver
 *    profile already renders that absence honestly as "Independent driver".
 *  - When a fleetId IS supplied it is validated against Firestore, and the
 *    stored `fleetName` is read from the fleet document rather than taken
 *    from the request body. A client cannot assert a fleet's name, and the
 *    denormalized name can never drift from the fleet it points at.
 *  - An unknown or non-joinable fleetId is rejected with 400 rather than
 *    silently ignored, so a broken form can't quietly produce unattributed
 *    applications.
 *
 * ---------------------------------------------------------------------------
 * HARDENED 2026-08-18 — a public form could strip an admin's role
 * ---------------------------------------------------------------------------
 * Roles in this platform are derived, not stored on the account: the claims
 * sync in /api/admin/backfill-claims looks the caller's email up in
 * `driverApplications` / `fleetApplications` and writes the matching role as a
 * custom claim.
 *
 * This endpoint is unauthenticated by design — anyone can apply to drive. So
 * anyone could submit a driver application using an existing administrator's
 * email address, and the next time that administrator's claims were synced,
 * their `super_admin` claim would be overwritten with `driver`. No credentials,
 * no account, no access required: a public form field was enough to demote an
 * admin and lock them out of the console.
 *
 * This was found the hard way on 2026-08-18. A test driver application was
 * submitted using the Super Admin's own address (it was the only address the
 * unverified Resend domain would deliver to), and the Super Admin account was
 * demoted to `driver` — /admin/super started redirecting to the driver portal.
 * It was recoverable only because PR #18's bootstrap allowlist could re-mint
 * the role once no super_admin remained. Had that safety net already been
 * consumed, recovery would have needed a service account.
 *
 * The guard below rejects applications whose email already belongs to an
 * account holding an elevated role. Notes on the design:
 *
 *  - It is checked against Firebase Auth custom claims, which are the actual
 *    source of authority — not against a list of addresses in Firestore, which
 *    would be another derived value.
 *  - The rejection message is deliberately neutral and does not confirm that
 *    the address belongs to an administrator, to avoid turning this endpoint
 *    into an admin-account enumeration oracle. It is not perfectly opaque —
 *    a determined prober can still distinguish it from a validation error —
 *    but it does not volunteer the reason.
 *  - This closes the injection point, not the root cause. The claims sync will
 *    still happily overwrite an elevated role if a matching application
 *    somehow exists (for example, a long-standing driver who is later promoted
 *    to admin). The durable fix is for the sync to refuse to downgrade an
 *    existing privileged claim. Tracked as #212; it lives in
 *    api/admin/backfill-claims/route.ts.
 *  - The equivalent fleet intake route needs the same guard. Also #212.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const required = [
      "fullName",
      "email",
      "phone",
      "city",
      "country",
      "licenseNumber",
      "yearsExperience",
      "vehicleType",
    ]
    for (const key of required) {
      if (!body?.[key]) {
        return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 })
      }
    }

    const email = String(body.email).trim().toLowerCase()

    // Refuse to create a record that could overwrite an administrator's role.
    if (await emailBelongsToPrivilegedAccount(email)) {
      return NextResponse.json(
        { error: "This email address can't be used for a driver application." },
        { status: 400 }
      )
    }

    // Resolve the chosen fleet, if any, from Firestore — never from the body.
    const requestedFleetId =
      typeof body.fleetId === "string" && body.fleetId.trim() && body.fleetId !== "independent"
        ? body.fleetId.trim()
        : null

    let fleetFields: { fleetId: string; fleetName: string } | Record<string, never> = {}

    if (requestedFleetId) {
      const fleetDoc = await adminDb().collection("fleetApplications").doc(requestedFleetId).get()
      const fleetData = fleetDoc.exists ? fleetDoc.data() : null
      const joinable = ["Approved", "Invited", "Active"]
      if (!fleetData || !joinable.includes(fleetData.status)) {
        return NextResponse.json({ error: "Unknown or unavailable fleet" }, { status: 400 })
      }
      const resolvedName = (fleetData.fleetName || fleetData.businessName || "").toString().trim()
      if (!resolvedName) {
        return NextResponse.json({ error: "Unknown or unavailable fleet" }, { status: 400 })
      }
      fleetFields = { fleetId: fleetDoc.id, fleetName: resolvedName }
    }

    const doc = await adminDb()
      .collection("driverApplications")
      .add({
        fullName: body.fullName,
        email,
        phone: body.phone,
        city: body.city,
        country: body.country,
        licenseNumber: body.licenseNumber,
        yearsExperience: body.yearsExperience,
        vehicleType: body.vehicleType,
        hasOwnVehicle: body.hasOwnVehicle ?? "yes",
        ...fleetFields,
        source: "rideblak.com",
        status: "Pending Review",
        documents: {},
        createdAt: FieldValue.serverTimestamp(),
      })

    return NextResponse.json({ id: doc.id })
  } catch (error) {
    console.error("driver-applications POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
