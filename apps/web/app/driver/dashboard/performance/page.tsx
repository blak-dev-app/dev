"use client"

import * as React from "react"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { useAdminClaims } from "@/lib/auth-claims"

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

function RateRow({ label, count, total, pct }: { label: string; count: number; total: number; pct: number }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <div className="w-32 shrink-0 text-muted-foreground">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 shrink-0 text-right font-medium">
        {count}/{total} ({pct}%)
      </div>
    </div>
  )
}

export default function DriverPerformancePage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [driver, setDriver] = React.useState<any>(null)
  const [rides, setRides] = React.useState<any[]>([])
  const [dataLoading, setDataLoading] = React.useState(true)

  // Scoped to this driver's own driverId â see
  // BLAK_IMPLEMENTATION_STATUS.md Phase 5/11. Completion/cancellation
  // rates below are computed from this driver's own real ride history,
  // not fabricated â they will honestly read 0/0 (0%) until ride booking
  // is live and rides start carrying a driverId (Phase 9).
  React.useEffect(() => {
    if (!driverId) {
      setDataLoading(false)
      return
    }
    const unsubs = [
      onSnapshot(doc(db, "driverApplications", driverId), (snap) => {
        setDriver(snap.exists() ? snap.data() : null)
        setDataLoading(false)
      }),
      onSnapshot(query(collection(db, "rides"), where("driverId", "==", driverId)), (snap) => {
        setRides(snap.docs.map((d) => d.data()))
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [driverId])

  const total = rides.length
  const completed = rides.filter((r) => r.status === "Completed").length
  const cancelled = rides.filter((r) => r.status === "Cancelled").length
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <DriverShell welcomeName={driver?.fullName}>
      <PageHeader title="PERFORMANCE" />
      {claimsLoading || dataLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Rating"
              value={driver?.rating ? Number(driver.rating).toFixed(1) : "—"}
              sub={driver?.reviewCount != null ? `${driver.reviewCount} reviews` : undefined}
            />
            <StatCard label="Total Rides" value={total} />
            <StatCard label="Completion Rate" value={`${pct(completed)}%`} />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Ride outcomes (all time)</h3>
            {total === 0 ? (
              <p className="text-xs text-muted-foreground">
                No rides recorded yet — performance figures will populate once ride booking is live.
              </p>
            ) : (
              <>
                <RateRow label="Completed" count={completed} total={total} pct={pct(completed)} />
                <RateRow label="Cancelled" count={cancelled} total={total} pct={pct(cancelled)} />
              </>
            )}
          </div>
        </>
      )}
    </DriverShell>
  )
}
