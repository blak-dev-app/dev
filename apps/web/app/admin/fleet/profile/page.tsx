"use client"

import * as React from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { fleetNavItems } from "@/lib/admin/nav"
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
  if (!name) return "FL"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Read-only for v1, mirroring the Driver Profile pattern (PR #14, Phase 5)
 * — see BLAK_IMPLEMENTATION_STATUS.md Phase 4. No Firestore write path
 * exists yet for a fleet to edit its own fleetApplications fields, so
 * editing is deferred the same way rather than guessed at here.
 *
 * "Vehicles (at signup)" is deliberately labelled, not "Vehicles" — it's
 * the self-reported count from the fleet's original application
 * (Fleet.vehicles in lib/types.ts), not a live count of the `vehicles`
 * collection. Showing a live fleet-scoped vehicle count belongs on the
 * Dashboard/Performance pages, not fabricated or implied here.
 */
export default function FleetProfilePage() {
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [fleet, setFleet] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!fleetId) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      doc(db, "fleetApplications", fleetId),
      (snap) => {
        setFleet(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
   ")
    return () => unsub()
  }, [fleetId])

  const name = fleet?.fleetName || fleet?.businessName

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <PageHeader title="FLEET PROFILE" />
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !fleetId || !fleet ? (
        <p className="text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </p>
      ) : (
        <div className="max-w-lg">
          <div className="mb-6 flex items-center gap-4">
            <div className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials(name)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{name || "—"}</h3>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {fleet.status || "—"}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-5">
            <Row label="Fleet ID" value={fleetId.slice(0, 8).toUpperCase()} />
            <Row label="Business name" value={fleet.businessName} />
            <Row label="Email" value={fleet.email} />
            <Row label="Phone" value={fleet.phone} />
            <Row label="Vehicles (at signup)" value={fleet.vehicles} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            To update these details, contact BLAK Super Admin.
          </p>
        </div>
      )}
    </AdminShell>
  )
}
