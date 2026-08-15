import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.name || !body?.email || !body?.contactEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
