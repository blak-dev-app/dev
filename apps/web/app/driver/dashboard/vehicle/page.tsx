"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { useAdminClaims } from "@/lib/auth-claims"

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

export default function DriverVehiclePage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [vehicle, setVehicle] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  // Scoped to this driver's own driverId â a driver can only ever read
  // vehicle docs assigned to them (firestore.rules: resource.data.driverId
  // == myDriverId()) â see BLAK_IMPLEMENTATION_STATUS.md Phase 5/8.
  React.useEffect(() => {
    if (!driverId) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "vehicles"), where("driverId", "==", driverId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVehicle(snap.docs[0]?.data() ?? null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [driverId])

  return (
    <DriverShell>
      <PageHeader title="VEHICLE" />
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : !vehicle ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No vehicle has been assigned to you yet. Once your fleet admin (or BLAK Super Admin)
          assigns a vehicle, it will appear here automatically.
        </div>
      ) : (
        <div className="max-w-md rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{vehicle.vehicleType || "Vehicle"}</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {vehicle.status || "Available"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Assigned on</dt>
            <dd className="text-right">{formatDate(vehicle.createdAt)}</dd>
          </dl>
        </div>
      )}
    </DriverShell>
  )
}
