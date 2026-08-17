"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { DocumentUpload } from "@/components/portal/document-upload"

const DOC_TYPES = [
  { key: "license", label: "Driver's license" },
  { key: "registration", label: "Vehicle registration" },
  { key: "insurance", label: "Proof of insurance" },
  { key: "backgroundCheck", label: "Background check / police clearance" },
  { key: "photo", label: "Profile photo" },
]

export default function DriverPortalPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [application, setApplication] = React.useState<any>(null)
  const [applicationId, setApplicationId] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/driver/login")
        return
      }
      try {
        const q = query(
          collection(db, "driverApplications"),
          where("authUid", "==", user.uid),
          limit(1)
        )
        const snap = await getDocs(q)
        if (snap.empty) {
          setError("We couldn't find an application linked to this account.")
        } else {
          const docSnap = snap.docs[0]!
          const data = docSnap.data()
          // Fully approved drivers belong on the real dashboard, not this
          // onboarding hub — see BLAK_IMPLEMENTATION_STATUS.md Phase 5.
          // DriverShell re-checks this same status server-side-of-trust
          // (reads Firestore directly) on every /driver/dashboard/* page
          // load, so this redirect is purely a convenience for drivers who
          // land here directly (e.g. an old bookmark) — it isn't the
          // security boundary.
          if (data?.status === "Active") {
            router.replace("/driver/dashboard")
            return
          }
          setApplicationId(docSnap.id)
          setApplication(data)
        }
      } catch (err) {
        console.error(err)
        setError("Something went wrong loading your application.")
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
        Welcome{application?.fullName ? `, ${application.fullName}` : ""}
      </h1>
      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : application?.status === "Documents Submitted" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your documents are under final review. We'll email you once a decision has been made.
        </p>
      ) : application?.status === "Rejected" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for your interest in BLAK. Unfortunately we're unable to move forward with your application at this time.
        </p>
      ) : (
        <>
          <p className="mt-4 mb-6 text-sm text-muted-foreground">
            Please upload the following documents to complete your driver application.
          </p>
          <DocumentUpload
            collection="driverApplications"
            applicationId={applicationId}
            docTypes={DOC_TYPES}
            storagePrefix={`driver-documents/${applicationId}`}
            existingDocuments={application?.documents}
          />
        </>
      )}
    </div>
  )
}
