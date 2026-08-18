"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { DocumentUpload } from "@/components/portal/document-upload"

const DOC_TYPES = [
  { key: "businessLicense", label: "Business license" },
  { key: "insurance", label: "Commercial insurance certificate" },
  { key: "vehicleRegistration", label: "Vehicle registration(s)" },
  { key: "taxDocument", label: "Tax / W-9 document" },
]

/**
 * Fleet operator onboarding — document upload after an invite.
 *
 * ---------------------------------------------------------------------------
 * FIXED 2026-08-18 — page was unreachable for invited fleets
 * ---------------------------------------------------------------------------
 * This page used to find the fleet's application with a single collection
 * query: `fleetApplications where authUid == user.uid`. That is a LIST
 * operation, and Firestore evaluates list queries against the rules up front:
 * a query is only allowed if the rules can prove every document it could
 * return is readable. `firestore.rules` authorises fleet reads by matching
 * the caller's `fleetId` claim against the document id — not by `authUid` —
 * so a query keyed on authUid can never satisfy it and Firestore rejects the
 * whole request. The catch block then rendered the generic "Something went
 * wrong loading your application."
 *
 * It appeared to work earlier only because of the `noRoleYet()` bootstrap
 * branch in the rules: before an account has any role claim, reads are
 * permitted. The moment an invited fleet became a real `fleet_admin` — which
 * is exactly when they need this page — the query started failing. Confirmed
 * live 2026-08-18 with the first genuinely invited fleet.
 *
 * The fix reads the document directly by id, which is what the rules are
 * written for:
 *
 *  1. Read `fleetId` from the caller's own custom claims. If it is missing,
 *     self-heal once via /api/admin/backfill-claims and refresh the token —
 *     the same pattern AdminShell and DriverShell already use.
 *  2. With a fleetId, `getDoc(doc(db, "fleetApplications", fleetId))` — a
 *     single-document read that the fleetId rule authorises directly.
 *  3. Only if there is still no fleetId claim (a genuinely un-backfilled
 *     account) fall back to the old authUid query, which succeeds under the
 *     noRoleYet() bootstrap branch. This keeps first-invite flows working.
 *
 * Errors are also reported distinctly now: a permissions failure and a
 * network/unknown failure are different problems and shouldn't share one
 * message that tells the operator nothing.
 */
export default function FleetOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [application, setApplication] = React.useState<any>(null)
  const [applicationId, setApplicationId] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/fleet-onboarding/login")
        return
      }
      try {
        let tokenResult = await user.getIdTokenResult()
        let fleetId = tokenResult.claims.fleetId as string | undefined

        // Self-heal claims once, exactly as the admin/driver shells do.
        if (!fleetId) {
          try {
            await fetch("/api/admin/backfill-claims", {
              method: "POST",
              headers: { Authorization: `Bearer ${tokenResult.token}` },
            })
            tokenResult = await user.getIdTokenResult(true)
            fleetId = tokenResult.claims.fleetId as string | undefined
          } catch {
            // Fall through — the authUid fallback below may still work.
          }
        }

        if (fleetId) {
          const snap = await getDoc(doc(db, "fleetApplications", fleetId))
          if (!snap.exists()) {
            setError("We couldn't find an application linked to this account.")
          } else {
            setApplicationId(snap.id)
            setApplication(snap.data())
          }
        } else {
          // No fleetId claim yet: allowed by the noRoleYet() bootstrap rule.
          const q = query(
            collection(db, "fleetApplications"),
            where("authUid", "==", user.uid),
            limit(1)
          )
          const snap = await getDocs(q)
          const docSnap = snap.docs[0]
          if (!docSnap) {
            setError("We couldn't find an application linked to this account.")
          } else {
            setApplicationId(docSnap.id)
            setApplication(docSnap.data())
          }
        }
      } catch (err) {
        console.error("fleet-onboarding load failed:", err)
        const code = (err as { code?: string } | null)?.code
        if (code === "permission-denied") {
          setError(
            "This account doesn't have permission to view that application. If you've just been invited, sign out and back in — or contact BLAK Super Admin."
          )
        } else {
          setError("Something went wrong loading your application. Please try again.")
        }
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-2xl font-bold">
        Welcome{application?.fleetName ? `, ${application.fleetName}` : ""}
      </h1>
      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : application?.status === "Documents Submitted" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your documents are under final review. We&apos;ll email you once a decision has been made.
        </p>
      ) : application?.status === "Active" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          You&apos;re fully approved as a BLAK Operator. Welcome aboard!
        </p>
      ) : application?.status === "Rejected" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for your interest in BLAK. Unfortunately we&apos;re unable to move forward with your application at this time.
        </p>
      ) : (
        <>
          <p className="mt-4 mb-6 text-sm text-muted-foreground">
            Please upload the following documents to complete your operator application.
          </p>
          <DocumentUpload
            collection="fleetApplications"
            applicationId={applicationId}
            docTypes={DOC_TYPES}
            storagePrefix={`fleet-documents/${applicationId}`}
            existingDocuments={application?.documents}
          />
        </>
      )}
    </div>
  )
}
