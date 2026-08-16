"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { superNavItems } from "@/lib/admin/nav"
import { DateRangeFilter, isWithinDateRange, type DateRangeValue } from "@/components/admin/date-range-filter"

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

function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg viewBox="0 0 160 60" width="100%" height="56" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      {points.split(" ").map((p, i) => {
        const [x, y] = p.split(",")
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />
      })}
    </svg>
  )
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

export default function SuperAdminDashboard() {
  const [fleets, setFleets] = React.useState<Doc[]>([])
  const [drivers, setDrivers] = React.useState<Doc[]>([])
  const [passengers, setPassengers] = React.useState<Doc[]>([])
  const [rides, setRides] = React.useState<Doc[]>([])
  const [transactions, setTransactions] = React.useState<Doc[]>([])
  const [rideRange, setRideRange] = React.useState<DateRangeValue>("all")
  const [plRange, setPlRange] = React.useState<DateRangeValue>("all")

  React.useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "fleetApplications"), (snap) =>
        setFleets(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(collection(db, "driverApplications"), (snap) =>
        setDrivers(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(collection(db, "passengers"), (snap) =>
        setPassengers(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(collection(db, "rides"), (snap) =>
        setRides(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(
        query(collection(db, "transactions"), orderBy("createdAt", "desc")),
        (snap) => setTransactions(snap.docs.map((d) => d.data()))
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const totalFleets = fleets.filter((f) => f.status === "Approved").length
  const totalDrivers = drivers.length
  const totalPassengers = passengers.length
  const totalRevenue = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const ridesInRange = rides.filter((r) => isWithinDateRange(r.createdAt, rideRange))
  const totalRides = ridesInRange.length
  const completed = ridesInRange.filter((r) => r.status === "Completed").length
  const running = ridesInRange.filter((r) => r.status === "Running").length
  const cancelled = ridesInRange.filter((r) => r.status === "Cancelled").length
  const pct = (n: number) => (totalRides ? Math.round((n / totalRides) * 100) : 0)

  const transactionsInRange = transactions.filter((t) => isWithinDateRange(t.createdAt, plRange))
  const totalProfit = transactionsInRange
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const totalLoss = transactionsInRange
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const recentTransactions = transactions.slice(0, 6)

  const fleetEnquiries = fleets.length
  const driverEnquiries = drivers.length
  const passengerEnquiries = passengers.length
  const totalEnquiries = fleetEnquiries + driverEnquiries + passengerEnquiries

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="🚕" label={<>Total<br />Fleets</>} value={totalFleets} />
        <KpiCard icon="🚗" label={<>Total<br />Drivers</>} value={totalDrivers} />
        <KpiCard icon="📱" label={<>Total<br />Passengers</>} value={totalPassengers} />
        <KpiCard
          icon="📈"
          label={<>Total<br />Revenue (USD)</>}
          value={totalRevenue.toLocaleString()}
          accent
        />
      </div>

      <p className="my-6 text-xs font-semibold text-muted-foreground">
        Live from Firestore — fleets/drivers reflect real signups; rides, passengers and revenue
        will populate once those features go live.
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
            Ride Status <DateRangeFilter value={rideRange} onChange={setRideRange} />
          </h3>
          <div className="mb-4 text-xs text-muted-foreground">
            Total Rides <span className="ml-1 text-sm font-semibold text-foreground">{totalRides}</span>
          </div>
          <StatusRow label="Completed" count={completed} pct={pct(completed)} />
          <StatusRow label="Running" count={running} pct={pct(running)} />
          <StatusRow label="Cancelled" count={cancelled} pct={pct(cancelled)} />
          {totalRides === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              No rides {rideRange === "all" ? "yet — ride booking isn't live." : "in this date range."}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
            Profit &amp; Loss <DateRangeFilter value={plRange} onChange={setPlRange} />
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-success-light p-4">
              <div className="text-xs font-medium text-muted-foreground">Total Profit</div>
              <div className="text-xl font-semibold">{totalProfit.toLocaleString()}</div>
              <Sparkline points="4,50 28,50 52,50 76,50 100,50 124,50 148,50" color="var(--success)" />
            </div>
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="text-xs font-medium text-muted-foreground">Total Loss</div>
              <div className="text-xl font-semibold">{totalLoss.toLocaleString()}</div>
              <Sparkline points="4,50 28,50 52,50 76,50 100,50 124,50 148,50" color="var(--destructive)" />
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

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-2xl">
            ℹ️
          </span>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Total Enquiries</div>
            <div className="mt-1 text-2xl font-semibold">{totalEnquiries}</div>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted px-6 py-3 text-center">
              <div className="text-xs text-muted-foreground">Fleet</div>
              <div className="text-lg font-semibold">{fleetEnquiries}</div>
            </div>
            <div className="rounded-lg bg-muted px-6 py-3 text-center">
              <div className="text-xs text-muted-foreground">Driver</div>
              <div className="text-lg font-semibold">{driverEnquiries}</div>
            </div>
            <div className="rounded-lg bg-muted px-6 py-3 text-center">
              <div className="text-xs text-muted-foreground">Passenger</div>
              <div className="text-lg font-semibold">{passengerEnquiries}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
