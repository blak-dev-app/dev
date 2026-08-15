import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"

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
        fleetName: "BLAK",
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
