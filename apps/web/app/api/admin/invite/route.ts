import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { queueEmail } from "@/lib/mailer"
import { requireAdmin } from "@/lib/require-admin"

const COLLECTIONS = { driver: "driverApplications", fleet: "fleetApplications" } as const
const REDIRECT_PATHS = { driver: "/driver/login", fleet: "/fleet-onboarding/login" } as const
const LABELS = { driver: "Driver", fleet: "Fleet Partner" } as const

export async function POST(request: Request) {
  try {
    const decoded = await requireAdmin(request)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { type, id } = await request.json()
    if (type !== "driver" && type !== "fleet") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
    const collection = COLLECTIONS[type as "driver" | "fleet"]
    const docRef = adminDb().collection(collection).doc(id)
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }
    const data = snap.data()!
    const email: string | undefined = data.email || data.contactEmail
    const name: string = data.fullName || data.contactName || data.fleetName || "there"
    if (!email) {
      return NextResponse.json({ error: "Application has no email on file" }, { status: 400 })
    }
    let userRecord
    try { userRecord = await adminAuth().getUserByEmail(email) }
    catch { userRecord = await adminAuth().createUser({ email }) }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dev-web-blak-dev.vercel.app"
    const inviteLink = await adminAuth().generatePasswordResetLink(email, {
      url: `${siteUrl}${REDIRECT_PATHS[type as "driver" | "fleet"]}`,
    })
    await docRef.update({ authUid: userRecord.uid, status: "Invited", inviteLink, invitedAt: FieldValue.serverTimestamp() })
    try {
      await queueEmail({
        to: email,
        subject: `You're invited to complete your BLAK ${LABELS[type as "driver" | "fleet"]} application`,
        html: `<p>Hi ${name},</p><p>Your BLAK ${LABELS[type as "driver" | "fleet"]} application has been approved for the next step. Click the link below to set your password and log in to upload your documents:</p><p><a href="${inviteLink}">${inviteLink}</a></p><p>— The BLAK Team</p>`,
      })
    } catch (mailError) { console.error("queueEmail failed (invite link still generated):", mailError) }
    return NextResponse.json({ inviteLink })
  } catch (error) {
    console.error("admin/invite POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
