import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"

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
 *  - An unknown or non-Approved fleetId is rejected with 400 rather than
 *    silently ignored, so a broken form can't quietly produce unattributed
 *    applications.
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

    // Resolve the chosen fleet, if any, from Firestore — never from the body.
    const requestedFleetId =
      typeof body.fleetId === "string" && body.fleetId.trim() && body.fleetId !== "independent"
        ? body.fleetId.trim()
        : null

    let fleetFields: { fleetId: string; fleetName: string } | Record<string, never> = {}

    if (requestedFleetId) {
      const fleetDoc = await adminDb().collection("fleetApplications").doc(requestedFleetId).get()
      const fleetData = fleetDoc.exists ? fleetDoc.data() : null
      if (!fleetData || fleetData.status !== "Approved") {
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
        email: body.email,
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
