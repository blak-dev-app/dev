import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { queueEmail } from "@/lib/mailer"
import { requireRole } from "@/lib/require-admin"
import { resolveFleetIdByName } from "@/lib/fleet-resolve"

const COLLECTIONS = { driver: "driverApplications", fleet: "fleetApplications" } as const

export async function POST(request: Request) {
  try {
    const decoded = await requireRole(request, ["super_admin"])
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { type, id, decision } = await request.json()
    if (type !== "driver" && type !== "fleet") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
    if (decision !== "Active" && decision !== "Rejected") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 })
    }
    const docRef = adminDb().collection(COLLECTIONS[type as "driver" | "fleet"]).doc(id)
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }
    const data = snap.data()!
    const email: string | undefined = data.email || data.contactEmail
    await docRef.update({ status: decision, decidedAt: FieldValue.serverTimestamp() })

    // Defense in depth: if this account already has an authUid (was
    // invited before this decision), make sure its role claim reflects the
    // current, final state rather than relying solely on invite-time
    // claim-setting. Never fails the request if this part errors.
    if (decision === "Active" && data.authUid) {
      try {
        let fleetId: string | null = null
        if (type === "fleet") {
          fleetId = id
        } else {
          fleetId = data.fleetId ?? (await resolveFleetIdByName(adminDb(), data.fleetName))
        }
        await adminAuth().setCustomUserClaims(data.authUid, {
          role: type === "driver" ? "driver" : "fleet_admin",
          ...(type === "driver" ? { driverId: id } : {}),
          ...(fleetId ? { fleetId } : {}),
        })
        if (type === "driver" && fleetId && fleetId !== data.fleetId) {
          await docRef.update({ fleetId })
        }
      } catch (claimError) {
        console.error("final-decision: claim refresh failed (non-fatal):", claimError)
      }
    }

    if (email) {
      try {
        await queueEmail({
          to: email,
          subject: decision === "Active" ? "Your BLAK application has been approved" : "Update on your BLAK application",
          html: decision === "Active"
            ? `<p>Congratulations — your BLAK application has been fully approved. Welcome aboard!</p>`
            : `<p>Thank you for your interest in BLAK. After reviewing your submitted documents, we're unable to move forward with your application at this time.</p>`,
        })
      } catch (mailError) {
        console.error("queueEmail failed:", mailError)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("admin/final-decision POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
