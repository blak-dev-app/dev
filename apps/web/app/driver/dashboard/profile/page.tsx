"use client"

import * as React from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { useAdminClaims } from "@/lib/auth-claims"

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  )
}

function initials(name?: string) {
  if (!name) return "DR"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Read-only for v1 — see BLAK_IMPLEMENTATION_STATUS.md Phase 5. Editing
 * profile fields isn't wired to any Firestore write path yet (the only
 * driver-initiated update firestore.rules currently permits is the
 * document-upload flow, which always forces status back to "Documents
 * Submitted" — see components/portal/document-upload.tsx). Adding inline
 * profile editing needs its own rule/endpoint that doesn't carry that
 * side effect, tracked as a follow-up rather than guessed at here.
 */
export default function DriverProfilePage() {
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
      <PageHeader title="MY PROFILE" />
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId || !driver ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : (
        <div className="max-w-lg">
          <div className="mb-6 flex items-center gap-4">
            <div className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials(driver.fullName)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{driver.fullName || "—"}</h3>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {driver.status || "—"}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-5">
            <Row label="Email" value={driver.email} />
            <Row label="Phone" value={driver.phone} />
            <Row label="Address" value={driver.address} />
            <Row label="Vehicle type" value={driver.vehicleType} />
            <Row label="Fleet" value={driver.fleetName || "Independent driver"} />
            <Row label="Rating" value={driver.rating ? Number(driver.rating).toFixed(1) : undefined} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            To update these details, raise a ticket from the Support page.
          </p>
        </div>
      )}
    </DriverShell>
  )
}
