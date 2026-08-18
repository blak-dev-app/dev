import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/mailer"
import { requireRole } from "@/lib/require-admin"
import { resolveFleetIdByName } from "@/lib/fleet-resolve"
const COLLECTIONS = { driver: "driverApplications", fleet: "fleetApplications" } as const
const REDIRECT_PATHS = { driver: "/driver/login", fleet: "/fleet-onboarding/login" } as const
const LABELS = { driver: "Driver", fleet: "Fleet Partner" } as const

/**
 * Invite an approved applicant: create or find their Auth account, mint the
 * real role claim, generate a password-reset link, and email it to them.
 *
 * ---------------------------------------------------------------------------
 * TWO CHANGES 2026-08-18 (task #210)
 * ---------------------------------------------------------------------------
 *
 * 1. THE SEND RESULT IS NO LONGER DISCARDED.
 *
 *    This route used to wrap queueEmail() in a bare try/catch that logged to
 *    the server console and carried on, returning the same 200 whether the
 *    mail went out or not. That is how this platform spent weeks believing it
 *    sent email while the queue had no consumer at all (#206): nothing ever
 *    threw, so nothing ever looked wrong. sendEmail() returns an explicit
 *    {ok: true, id} | {ok: false, error} for precisely this reason.
 *
 *    The outcome is now returned to the caller AND written to the application
 *    document. Persisting it matters more than returning it: a flag in an API
 *    response is seen only by whoever happened to be looking at the screen,
 *    whereas lastInviteEmailOk is still there next week when someone asks
 *    "did this operator ever actually receive their invite?".
 *
 *    A failed send is deliberately NOT a failed request. By the time email is
 *    attempted, the Auth account, the custom claims and the status transition
 *    are all already durable, and Super Admin is shown the invite link either
 *    way. Returning 500 would discard real work and misdescribe what happened.
 *    The request succeeded; the email did not. Those are two different facts
 *    and the response now states both instead of conflating them.
 *
 * 2. THE INVITE LINK IS NO LONGER STORED ON THE DOCUMENT.
 *
 *    generatePasswordResetLink() returns a live credential: anyone holding it
 *    can set a password on that account and sign in as that person. It was
 *    being written straight into the application document, where - until the
 *    rules fix earlier today - any signed-in account with no role claim could
 *    read every application and harvest unconsumed invites. See
 *    security-noroleyet-invite-link.md. The rules now close that path, but the
 *    correct fix is not to store the credential at all: it is returned over
 *    HTTPS to an authenticated super_admin and never persisted.
 *
 *    Legacy values are actively removed with FieldValue.delete() rather than
 *    left in place, so every re-invite scrubs any link written by the old code
 *    path. There is also a practical argument: the Super Admin UI renders this
 *    link as a one-click anchor, and it was clicked by accident during today's
 *    delivery test.
 */
export async function POST(request: Request) {
  try {
    const decoded = await requireRole(request, ["super_admin"])
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
    try {
      userRecord = await adminAuth().getUserByEmail(email)
    } catch {
      userRecord = await adminAuth().createUser({ email })
    }
    // Resolve + persist fleetId, then set the real role claim for this
    // account. This is what makes /admin/fleet/login (fleet_admin) and
    // /driver/login (driver) actually scoped once the person signs in —
    // see BLAK_IMPLEMENTATION_STATUS.md Phase 2.
    let fleetId: string | null = null
    if (type === "fleet") {
      fleetId = id
    } else {
      fleetId = data.fleetId ?? (await resolveFleetIdByName(adminDb(), data.fleetName))
    }
    await adminAuth().setCustomUserClaims(userRecord.uid, {
      role: type === "driver" ? "driver" : "fleet_admin",
      ...(type === "driver" ? { driverId: id } : {}),
      ...(fleetId ? { fleetId } : {}),
    })
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dev-web-blak-dev.vercel.app"
    const inviteLink = await adminAuth().generatePasswordResetLink(email, {
      url: `${siteUrl}${REDIRECT_PATHS[type as "driver" | "fleet"]}`,
    })
    const label = LABELS[type as "driver" | "fleet"]
    const sent = await sendEmail({
      to: email,
      subject: `You're invited to complete your BLAK ${label} application`,
      html: `<p>Hi ${name},</p><p>Your BLAK ${label} application has been approved for the next step. Click the link below to set your password and log in to upload your documents:</p><p><a href="${inviteLink}">${inviteLink}</a></p><p>— The BLAK Team</p>`,
    })
    if (!sent.ok) {
      console.error("admin/invite: email send failed for", email, "-", sent.error)
    }
    await docRef.update({
      authUid: userRecord.uid,
      status: "Invited",
      // Never persist the reset link, and scrub anything the old path stored.
      inviteLink: FieldValue.delete(),
      invitedAt: FieldValue.serverTimestamp(),
      // Flat fields rather than a nested map: server timestamps are simpler to
      // reason about at the top level, and these are the fields an operator
      // will want to filter on when auditing who was actually reachable.
      lastInviteEmailOk: sent.ok,
      lastInviteEmailAt: FieldValue.serverTimestamp(),
      lastInviteEmailId: sent.ok ? sent.id : FieldValue.delete(),
      lastInviteEmailError: sent.ok ? FieldValue.delete() : sent.error,
      ...(type === "driver" && fleetId ? { fleetId } : {}),
    })
    return NextResponse.json({
      inviteLink,
      emailSent: sent.ok,
      ...(sent.ok ? { emailId: sent.id } : { emailError: sent.error }),
    })
  } catch (error) {
    console.error("admin/invite POST failed:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
