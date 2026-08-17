"use client"

import * as React from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DocumentUpload } from "@/components/portal/document-upload"
import { useAdminClaims } from "@/lib/auth-claims"

const DOC_TYPES = [
  { key: "license", label: "Driver's license" },
  { key: "registration", label: "Vehicle registration" },
  { key: "insurance", label: "Proof of insurance" },
  { key: "backgroundCheck", label: "Background check / police clearance" },
  { key: "photo", label: "Profile photo" },
]

export default function DriverDocumentsPage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [driver, setDriver] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!driverId) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      doc(db, "driverApplications", driverId),
      (snap) => {
        setDriver(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [driverId])

  return (
    <DriverShell welcomeName={driver?.fullName}>
      <PageHeader title="DOCUMENTS" />
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : (
        <div className="max-w-xl">
          <p className="mb-4 text-xs text-muted-foreground">
            These are the documents on file for your account. Re-uploading a document sends your
            account for re-verification, and you&apos;ll be moved back to the review queue until
            it&apos;s approved again.
          </p>
          <DocumentUpload
            collection="driverApplications"
            applicationId={driverId}
            docTypes={DOC_TYPES}
            storagePrefix={`driver-documents/${driverId}`}
            existingDocuments={driver?.documents}
          />
        </div>
      )}
    </DriverShell>
  )
}
