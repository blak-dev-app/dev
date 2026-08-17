"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { fleetNavItems } from "@/lib/admin/nav"
import { useAdminClaims } from "@/lib/auth-claims"

type Doc = Record<string, any>

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: React.ReactNode
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border p-5 ${
        accent ? "bg-primary/10" : "bg-card"
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-2xl">
        {icon}
      </span>
      <div>
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </div>
    </div>
  )
}

function StatusRow({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <div className="w-24 shrink-0 text-muted-foreground">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-right font-medium">{count}</div>
    </div>
  )
}

export default function FleetAdminDashboard() {
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [drivers, setDrivers] = React.useState<Doc[]>([])
  const [vehicles, setVehicles] = React.useState<Doc[]>([])
  const [rides, setRides] = React.useState<Doc[]>([])
  const [transactions, setTransactions] = React.useState<Doc[]>([])
  const [dataLoading, setDataLoading] = React.useState(true)

  // Every query below is scoped to this fleet's own fleetId, resolved from
  // the signed-in user's Firebase Auth custom claim — never from a URL or
  // form value a fleet admin could tamper with (spec section 31). See
  // BLAK_IMPLEMENTATION_STATUS.md Phase 2/4. Transactions are sorted
  // client-side rather than via a server orderBy so that query stays a
  // single equality filter and doesn't need a new Firestore composite
  // index on (fleetId, createdAt). The "Recent Queries" widget that was
  // here previously read the legacy `queries` collection, which the rest
  // of the app stopped writing to once tickets were unified
  // (PRODUCTION_READY_TRACKER.md Phase 2) — that was already a bug before
  // this change (it always showed "No queries yet"), not something
  // introduced here; left as-is pending a dedicated fix so this pass stays
  // scoped to fleet-isolation.
  React.useEffect(() => {
    if (!fleetId) {
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    const unsubs = [
      onSnapshot(query(collection(db, "driverApplications"), where("fleetId", "==", fleetId)), (snap) => {
        setDrivers(snap.docs.map((d) => d.data()))
        setDataLoading(false)
      }),
      onSnapshot(query(collection(db, "vehicles"), where("fleetId", "==", fleetId)), (snap) =>
        setVehicles(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(query(collection(db, "rides"), where("fleetId", "==", fleetId)), (snap) =>
        setRides(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(query(collection(db, "transactions"), where("fleetId", "==", fleetId)), (snap) => {
        const next = snap.docs.map((d) => d.data())
        next.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        setTransactions(next)
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [fleetId])

  const totalDrivers = drivers.length
  const activeDrivers = drivers.filter((d) => d.status === "Approved").length
  const inactiveDrivers = totalDrivers - activeDrivers
  const totalVehicles = vehicles.length
  const breakdownVehicles = vehicles.filter((v) => v.status === "Breakdown").length
  const totalRides = rides.length
  const completed = rides.filter((r) => r.status === "Completed").length
  const running = rides.filter((r) => r.status === "Running").length
  const cancelled = rides.filter((r) => r.status === "Cancelled").length
  const pct = (n: number) => (totalRides ? Math.round((n / totalRides) * 100) : 0)
  const totalRevenue = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const recentTransactions = transactions.slice(0, 6)

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      {claimsLoading || dataLoading ? (
        <p className="text-sm text-muted-foreground">Loading your fleet&apos;s data…</p>
      ) : !fleetId ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon="🚗" label={<>Total<br />Drivers</>} value={totalDrivers} />
            <KpiCard icon="🚙" label={<>Total<br />Vehicles</>} value={totalVehicles} />
            <KpiCard icon="📍" label={<>Total<br />Rides</>} value={totalRides} />
            <KpiCard
              icon="📈"
              label={<>Fleet<br />Revenue (USD)</>}
              value={totalRevenue.toLocaleString()}
              accent
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
                Recent Queries <span className="text-primary">0</span>
              </h3>
              <p className="py-2 text-xs text-muted-foreground">No queries yet.</p>
              <p className="mt-4 cursor-pointer text-xs font-medium text-primary">View all</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
                Ride Status <span className="text-xs text-muted-foreground">All time</span>
              </h3>
              <div className="mb-4 text-xs text-muted-foreground">
                Total Rides <span className="ml-1 text-sm font-semibold text-foreground">{totalRides}</span>
              </div>
              <StatusRow label="Completed" count={completed} pct={pct(completed)} />
              <StatusRow label="Running" count={running} pct={pct(running)} />
              <StatusRow label="Cancelled" count={cancelled} pct={pct(cancelled)} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Active Drivers</div>
                  <div className="text-sm font-semibold">{activeDrivers}</div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Inactive Drivers</div>
                  <div className="text-sm font-semibold">{inactiveDrivers}</div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Breakdown vehicle</div>
                  <div className="text-sm font-semibold">{breakdownVehicles}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
                Transactions <span className="text-xs text-muted-foreground">Recent</span>
              </h3>
              <div className="flex flex-col gap-3">
                {recentTransactions.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">No transactions yet.</p>
                ) : (
                  recentTransactions.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="size-8 shrink-0 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="font-medium">{t.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-semibold ${
                            t.type === "credit" ? "text-success" : "text-destructive"
                          }`}
                        >
                          {t.type === "credit" ? "Credited" : "Debited"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Number(t.amount) || 0} USD
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}
