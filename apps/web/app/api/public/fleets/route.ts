import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

/**
 * Statuses that mean "this fleet is onboarded enough for a driver to apply to it".
 *
 * FIXED 2026-08-18 - see below. This used to be the single literal "Approved".
 */
const JOINABLE_FLEET_STATUSES = ["Approved", "Invited", "Active"] as const

/**
 * Public list of fleets a driver can apply to join, for the Join Us driver
 * signup form — see BLAK_IMPLEMENTATION_STATUS.md Phase 15.
 *
 * Why this exists as a server route rather than a client Firestore query:
 * the signup form is unauthenticated, and `firestore.rules` requires auth on
 * `fleetApplications` reads. Rather than loosen those rules, this route uses
 * the Admin SDK server-side and returns only the two fields the dropdown
 * needs — document id and display name. Contact email, phone, vehicle counts
 * and application status are deliberately NOT included: this is a public,
 * unauthenticated endpoint and a fleet's contact details are not public
 * information.
 *
 * ---------------------------------------------------------------------------
 * FIXED 2026-08-18 — onboarding a fleet removed it from the signup form
 * ---------------------------------------------------------------------------
 * This route filtered on `status == "Approved"` alone. But "Approved" is only
 * one step of the fleet lifecycle:
 *
 *     Pending Review → Approved → Invited → (documents) → Active
 *
 * So the moment a fleet was actually invited and began onboarding, its status
 * moved past "Approved" and it silently disappeared from the driver signup
 * dropdown. The form then rendered its honest-but-wrong empty state, "No fleets
 * are currently accepting drivers", while a real fleet sat in the system. The
 * effect was exactly backwards: the further along an operator got, the less
 * reachable they became.
 *
 * Observed live 2026-08-18 with `Test fleet` — the fleet existed, was fully
 * onboarded, and the dropdown claimed there were none.
 *
 * The set below is the fix, and it is deliberately a named constant rather than
 * an inline literal so the lifecycle question ("which statuses accept drivers?")
 * has one obvious place to be answered:
 *
 *   - `Approved` — BLAK has accepted them; they can receive drivers.
 *   - `Invited`  — mid-onboarding, still a real accepted operator.
 *   - `Active`   — fully onboarded. Obviously joinable.
 *
 * Deliberately excluded: `Pending Review` (not yet vetted — attaching a driver
 * would create a linkage to an organisation BLAK has not approved) and
 * `Rejected` (declined). Both are the cases the original "Approved"-only filter
 * was right to exclude; the bug was that it excluded far more than that.
 */
export async function GET() {
  try {
    // Single `in` filter on one field — no composite index required.
    const snap = await adminDb()
      .collection("fleetApplications")
      .where("status", "in", [...JOINABLE_FLEET_STATUSES])
      .get()

    const fleets = snap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          fleetName: (data.fleetName || data.businessName || "").toString().trim(),
        }
      })
      .filter((f) => f.fleetName.length > 0)
      .sort((a, b) => a.fleetName.localeCompare(b.fleetName))

    return NextResponse.json(
      { fleets },
      {
        // Short cache: the list changes only when a fleet's status changes, but a
        // newly-joinable fleet should show up on the signup form quickly.
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      }
    )
  } catch (error) {
    console.error("public/fleets GET failed:", error)
    // Fail soft with an empty list rather than a 500: the signup form must
    // still be usable (as an independent driver) if this lookup breaks.
    return NextResponse.json({ fleets: [] })
  }
}
