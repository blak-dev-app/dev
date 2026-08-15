"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { fleetNavItems } from "@/lib/admin/nav"

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
  const [drivers, setDrivers] = React.useState<Doc[]>([])
  const [vehicles, setVehicles] = React.useState<Doc[]>([])
  const [rides, setRides] = React.useState<Doc[]>([])
  const [transactions, setTransactions] = React.useState<Doc[]>([])
  const [queries, setQueries] = React.useState<Doc[]>([])

  React.useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "driverApplications"), (snap) =>
        setDrivers(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(collection(db, "vehicles"), (snap) =>
        setVehicles(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(collection(db, "rides"), (snap) =>
        setRides(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(
        query(collection(db, "transactions"), orderBy("createdAt", "desc")),
        (snap) => setTransactions(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(
        query(collection(db, "queries"), orderBy("createdAt", "desc")),
        (snap) => setQueries(snap.docs.map((d) => d.data()))
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

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
  const recentQueries = queries.slice(0, 3)
  const recentTransactions = transactions.slice(0, 6)

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="🚗" label={<>Total<br />Drivers</>} value={totalDrivers} />
        <KpiCard icon="🚙" label={<>Total<br />Vehicles</>} value={totalVehicles} />
        <KpiCard icon="📍" label={<>Total<br />Rides</>} value={totalRides} />
        <KpiCard
          icon="📈"
          label={<>Total<br />Revenue (USD)</>}
          value={totalRevenue.toLocaleString()}
          accent
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
            Recent Queries <span className="text-primary">{queries.length}</span>
          </h3>
          {recentQueries.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No queries yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentQueries.map((qd, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">
                    {qd.message || qd.text || qd.subject || "No message"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(qd.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 cursor-pointer text-xs font-medium text-primary">View all</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
            Ride Status <span className="text-xs text-muted-foreground">Today ▾</span>
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
            Transactions <span className="text-xs text-muted-foreground">Month ▾</span>
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
    </AdminShell>
  )
}
