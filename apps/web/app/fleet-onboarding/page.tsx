"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { DocumentUpload } from "@/components/portal/document-upload"

const DOC_TYPES = [
  { key: "businessLicense", label: "Business license" },
  { key: "insurance", label: "Commercial insurance certificate" },
  { key: "vehicleRegistration", label: "Vehicle registration(s)" },
  { key: "taxDocument", label: "Tax / W-9 document" },
]

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
        const q = query(
          collection(db, "fleetApplications"),
          where("authUid", "==", user.uid),
          limit(1)
        )
        const snap = await getDocs(q)
        if (snap.empty) {
          setError("We couldn't find an application linked to this account.")
        } else {
          const docSnap = snap.docs[0]!
          setApplicationId(docSnap.id)
          setApplication(docSnap.data())
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
        Welcome{application?.fleetName ? `, ${application.fleetName}` : ""}
      </h1>
      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : application?.status === "Documents Submitted" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your documents are under final review. We'll email you once a decision has been made.
        </p>
      ) : application?.status === "Active" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          You're fully approved as a BLAK Operator. Welcome aboard!
        </p>
      ) : application?.status === "Rejected" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for your interest in BLAK. Unfortunately we're unable to move forward with your application at this time.
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
