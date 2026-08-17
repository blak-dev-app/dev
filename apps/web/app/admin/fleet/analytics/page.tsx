"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { fleetNavItems } from "@/lib/admin/nav"
import { useAdminClaims } from "@/lib/auth-claims"
import type { Ride, Transaction } from "@/lib/types"

function toDate(ts: any): Date | null {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? null : d
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

type MonthRow = {
  key: string
  rides: number
  completed: number
  cancelled: number
  revenue: number
  cumulativeRides: number
  cumulativeRevenue: number
}

/**
 * Fleet cumulative analytics — see BLAK_IMPLEMENTATION_STATUS.md Phase 4.
 *
 * The Fleet Dashboard already shows fleet-scoped point-in-time totals. What
 * did not exist anywhere was the cumulative/over-time view: how this fleet's
 * ride volume and revenue have accumulated month by month. That is what this
 * page adds, and nothing else — it deliberately does not restate the
 * dashboard's KPI cards.
 *
 * Every number here is derived from this fleet's own documents, read with a
 * single equality filter (`where("fleetId","==",fleetId)`) and aggregated in
 * the browser. Client-side sorting/grouping is intentional: adding a server
 * `orderBy("createdAt")` on top of the fleetId filter would require a new
 * Firestore composite index that does not exist (same reasoning as the
 * Dashboard, Drivers and Queries pages).
 *
 * Honesty constraints applied here, since this page is entirely derived numbers:
 *  - Revenue is the sum of `credit` transactions only. Debits are shown as a
 *    separate figure rather than silently netted, because no platform
 *    commission model exists yet (PlatformSettings in lib/types.ts is an
 *    unimplemented target shape) and netting them would imply one.
 *  - Rides with no `createdAt` cannot be placed in a month. They are counted
 *    in the lifetime totals and reported explicitly as "undated" rather than
 *    being dropped silently or bucketed into an arbitrary month.
 *  - Ride.fleetId is only populated on rides created after the 2026-08-17
 *    rollout and is deliberately never backfilled (see lib/types.ts), so this
 *    page is honest about being a post-rollout view, not all-time history.
 *  - Averages are only rendered when their denominator is non-zero.
 */
export default function FleetAnalyticsPage() {
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [rides, setRides] = React.useState<Ride[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!fleetId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubs = [
      onSnapshot(
        query(collection(db, "rides"), where("fleetId", "==", fleetId)),
        (snap) => {
          setRides(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ride))
          setLoading(false)
        },
        () => setLoading(false)
      ),
      onSnapshot(
        query(collection(db, "transactions"), where("fleetId", "==", fleetId)),
        (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction)),
        () => {}
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [fleetId])

  const totalRides = rides.length
  const completedRides = rides.filter((r) => r.status === "Completed").length
  const cancelledRides = rides.filter((r) => r.status === "Cancelled").length
  const undatedRides = rides.filter((r) => !toDate(r.createdAt)).length

  const credits = transactions.filter((t) => t.type === "credit")
  const debits = transactions.filter((t) => t.type === "debit")
  const totalRevenue = credits.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const totalDebits = debits.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const undatedTransactions = transactions.filter((t) => !toDate(t.createdAt)).length

  const months: MonthRow[] = React.useMemo(() => {
    const map = new Map<string, MonthRow>()
    const touch = (key: string) => {
      let row = map.get(key)
      if (!row) {
        row = {
          key,
          rides: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          cumulativeRides: 0,
          cumulativeRevenue: 0,
        }
        map.set(key, row)
      }
      return row
    }

    for (const r of rides) {
      const d = toDate(r.createdAt)
      if (!d) continue
      const row = touch(monthKey(d))
      row.rides += 1
      if (r.status === "Completed") row.completed += 1
      if (r.status === "Cancelled") row.cancelled += 1
    }
    for (const t of credits) {
      const d = toDate(t.createdAt)
      if (!d) continue
      touch(monthKey(d)).revenue += Number(t.amount) || 0
    }

    const ordered = [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
    let runRides = 0
    let runRevenue = 0
    for (const row of ordered) {
      runRides += row.rides
      runRevenue += row.revenue
      row.cumulativeRides = runRides
      row.cumulativeRevenue = runRevenue
    }
    return ordered.reverse()
  }, [rides, credits])

  const newestMonth = months.length ? months[0] : undefined
  const oldestMonth = months.length ? months[months.length - 1] : undefined
  const peakRides = months.reduce((m, r) => Math.max(m, r.rides), 0)
  const completionRate = totalRides ? Math.round((completedRides / totalRides) * 100) : null
  const avgRevenuePerCompleted = completedRides ? totalRevenue / completedRides : null

  const hasAnything = totalRides > 0 || transactions.length > 0

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <PageHeader title="FLEET ANALYTICS" />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Cumulative, live from Firestore — this fleet&apos;s own rides and transactions only.
      </p>

      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !fleetId ? (
        <p className="text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </p>
      ) : !hasAnything ? (
        <p className="text-sm text-muted-foreground">
          No rides or transactions recorded for this fleet yet. Cumulative figures will appear here
          as soon as there is real activity to total up.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total rides" value={totalRides} sub={`${completedRides} completed`} />
            <Kpi
              label="Completion rate"
              value={completionRate === null ? "—" : `${completionRate}%`}
              sub={`${cancelledRides} cancelled`}
            />
            <Kpi
              label="Revenue credited (USD)"
              value={totalRevenue.toLocaleString()}
              sub={`${credits.length} credit transaction${credits.length === 1 ? "" : "s"}`}
            />
            <Kpi
              label="Debited (USD)"
              value={totalDebits.toLocaleString()}
              sub={`${debits.length} debit transaction${debits.length === 1 ? "" : "s"} — shown separately, not netted`}
            />
          </div>

          {avgRevenuePerCompleted !== null ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Kpi
                label="Average revenue per completed ride (USD)"
                value={avgRevenuePerCompleted.toFixed(2)}
                sub="Total credited ÷ completed rides"
              />
              <Kpi
                label="Months with activity"
                value={months.length}
                sub={
                  oldestMonth && newestMonth
                    ? `${monthLabel(oldestMonth.key)} → ${monthLabel(newestMonth.key)}`
                    : undefined
                }
              />
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 text-sm font-semibold">Month by month</h3>
            <p className="mb-5 text-xs text-muted-foreground">
              Newest first. Cumulative columns are running totals from this fleet&apos;s first
              recorded month.
            </p>

            {months.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing to chart yet — no ride or transaction on this fleet carries a date.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {months.map((m) => (
                  <div key={m.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{monthLabel(m.key)}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.rides} ride{m.rides === 1 ? "" : "s"} · {m.completed} completed ·{" "}
                        {m.cancelled} cancelled · {m.revenue.toLocaleString()} USD
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${peakRides ? (m.rides / peakRides) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Cumulative: {m.cumulativeRides} ride
                      {m.cumulativeRides === 1 ? "" : "s"}, {m.cumulativeRevenue.toLocaleString()} USD
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {undatedRides > 0 || undatedTransactions > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Not shown in the month breakdown: {undatedRides} ride
              {undatedRides === 1 ? "" : "s"} and {undatedTransactions} transaction
              {undatedTransactions === 1 ? "" : "s"} with no recorded date. They are included in the
              lifetime totals above.
            </p>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Fleet attribution on rides and transactions began on 17 Aug 2026. Anything created
            before then has no reliable fleet of record and is deliberately excluded rather than
            guessed at.
          </p>
        </>
      )}
    </AdminShell>
  )
}
