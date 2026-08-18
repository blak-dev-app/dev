import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/mailer"
import { requireRole } from "@/lib/require-admin"
import { resolveFleetIdByName } from "@/lib/fleet-resolve"
const COLLECTIONS = { driver: "driverApplications", fleet: "fleetApplications" } as const

/**
 * Record the final approve/reject decision on an application and tell the
 * applicant.
 *
 * CHANGED 2026-08-18 (task #210): the email send result is no longer thrown
 * away. This route used to call queueEmail() inside a bare try/catch that
 * logged to the server console and returned `{ ok: true }` regardless — so an
 * applicant who was rejected, or approved, and never told about it looked
 * identical to one who was. That is the same swallow that let #206 hide for
 * weeks. sendEmail() returns {ok: true, id} | {ok: false, error}; the outcome
 * is now written onto the application document and returned to the caller.
 *
 * As in the invite route, a failed send is not a failed request: the decision
 * itself is already committed and is the thing that matters. The response now
 * distinguishes "decision recorded, applicant notified" from "decision
 * recorded, applicant NOT notified" instead of reporting both as `ok: true`.
 *
 * This one arguably matters more than the invite. A missed invite is visible —
 * the operator never signs in and someone chases it. A missed rejection is
 * invisible by construction: the applicant simply never hears back, and
 * nothing in the system indicates anything went wrong.
 */
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
    // No address on file is a real outcome, not a silent skip: record it so
    // "we never told this applicant" is answerable from the document alone.
    if (!email) {
      await docRef.update({
        decisionEmailOk: false,
        decisionEmailAt: FieldValue.serverTimestamp(),
        decisionEmailError: "No email address on file",
      })
      return NextResponse.json({
        ok: true,
        emailSent: false,
        emailError: "No email address on file",
      })
    }
    const sent = await sendEmail({
      to: email,
      subject:
        decision === "Active"
          ? "Your BLAK application has been approved"
          : "Update on your BLAK application",
      html:
        decision === "Active"
          ? `<p>Congratulations — your BLAK application has been fully approved. Welcome aboard!</p>`
          : `<p>Thank you for your interest in BLAK. After reviewing your submitted documents, we're unable to move forward with your application at this time.</p>`,
    })
    if (!sent.ok) {
      console.error("admin/final-decision: email send failed for", email, "-", sent.error)
    }
    await docRef.update({
      decisionEmailOk: sent.ok,
      decisionEmailAt: FieldValue.serverTimestamp(),
      decisionEmailId: sent.ok ? sent.id : FieldValue.delete(),
      decisionEmailError: sent.ok ? FieldValue.delete() : sent.error,
    })
    return NextResponse.json({
      ok: true,
      emailSent: sent.ok,
      ...(sent.ok ? { emailId: sent.id } : { emailError: sent.error }),
    })
  } catch (error) {
    console.error("admin/final-decision POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
