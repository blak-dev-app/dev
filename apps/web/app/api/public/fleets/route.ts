import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

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
 * Only `Approved` fleets are listed. A fleet that is still Pending Review,
 * Invited, or Rejected is not something a driver should be able to attach
 * themselves to — doing so would create a driver linked to an organisation
 * BLAK hasn't onboarded yet.
 */
export async function GET() {
  try {
    const snap = await adminDb()
      .collection("fleetApplications")
      .where("status", "==", "Approved")
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
        // Short cache: the list changes only when a fleet is approved, but a
        // newly-approved fleet should show up on the signup form quickly.
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
