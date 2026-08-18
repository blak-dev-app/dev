import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

const PROTECTED_ROLES = ["super_admin", "fleet_admin"]

/**
 * True if this email belongs to an account that already holds a privileged
 * role, checked against Firebase Auth custom claims rather than another
 * derived value.
 *
 * Mirrors the guard added to /api/driver-applications in PR #23. Both intake
 * routes accept unauthenticated writes from the public Join Us form, and both
 * write into a collection that the claims sync derives roles from - so either
 * one on its own is enough to collide with an administrator's email address.
 * PR #25 made the sync itself non-destructive; this closes the remaining
 * intake path so the collision cannot even be recorded.
 */
async function emailBelongsToPrivilegedAccount(email: string): Promise<boolean> {
  try {
    const user = await adminAuth().getUserByEmail(email)
    const role = (user.customClaims?.role ?? "") as string
    return PROTECTED_ROLES.includes(role)
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code === "auth/user-not-found") return false
    console.error("operator-applications: privileged-email check failed:", error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.name || !body?.email || !body?.contactEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Both addresses end up on the fleet record and either could belong to an
    // existing administrator, so both are checked. The message deliberately
    // does not confirm that the address belongs to an admin account.
    for (const candidate of [body.email, body.contactEmail]) {
      if (typeof candidate === "string" && (await emailBelongsToPrivilegedAccount(candidate))) {
        return NextResponse.json(
          { error: "That email address is already in use. Please use a different one." },
          { status: 400 }
        )
      }
    }

    const doc = await adminDb()
      .collection("fleetApplications")
      .add({
        fleetName: body.name,
        businessName: body.operatingName || body.name,
        businessType: body.type,
        website: body.website,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        country: body.country,
        contactName: body.contactName,
        contactTitle: body.contactTitle,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        vehicles: body.vehicleCount,
        chauffeurCount: body.chauffeurCount,
        operatingMarkets: body.operatingMarkets,
        serviceTypes: body.serviceTypes,
        yearsInOperation: body.yearsInOperation,
        source: "rideblak.com",
        status: "Pending Review",
        documents: {},
        createdAt: FieldValue.serverTimestamp(),
      })

    return NextResponse.json({ id: doc.id })
  } catch (error) {
    console.error("operator-applications POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
