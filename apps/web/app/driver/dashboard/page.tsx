"use client"

import * as React from "react"
import Link from "next/link"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { useAdminClaims } from "@/lib/auth-claims"

type Doc = Record<string, any>

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
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
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-2xl">{icon}</span>
      <div>
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </div>
    </div>
  )
}

export default function DriverTodayPage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [driver, setDriver] = React.useState<Doc | null>(null)
  const [vehicle, setVehicle] = React.useState<Doc | null>(null)
  const [rides, setRides] = React.useState<Doc[]>([])
  const [dataLoading, setDataLoading] = React.useState(true)

  // Every query below is scoped to this driver's own driverId, resolved
  // from the signed-in user's Firebase Auth custom claim — never from a
  // URL or form value — see BLAK_IMPLEMENTATION_STATUS.md Phase 2/5.
  // Rides are sorted client-side rather than via a server orderBy so the
  // query stays a single equality filter and doesn't need a new Firestore
  // composite index on (driverId, createdAt) — same pattern used
  // throughout the Fleet Admin pages (Phase 4).
  React.useEffect(() => {
    if (!driverId) {
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    const unsubs = [
      onSnapshot(doc(db, "driverApplications", driverId), (snap) => {
        setDriver(snap.exists() ? snap.data() : null)
        setDataLoading(false)
      }),
      onSnapshot(query(collection(db, "vehicles"), where("driverId", "==", driverId)), (snap) => {
        setVehicle(snap.docs[0]?.data() ?? null)
      }),
      onSnapshot(query(collection(db, "rides"), where("driverId", "==", driverId)), (snap) => {
        const next = snap.docs.map((d) => d.data())
        next.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        setRides(next)
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [driverId])

  const totalRides = rides.length
  const completed = rides.filter((r) => r.status === "Completed").length
  const running = rides.filter((r) => r.status === "Running").length
  const cancelled = rides.filter((r) => r.status === "Cancelled").length
  const recentRides = rides.slice(0, 5)

  return (
    <DriverShell welcomeName={driver?.fullName}>
      {claimsLoading || dataLoading ? (
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      ) : !driverId ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account. Contact BLAK support if this
          seems wrong.
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-xl font-semibold tracking-wide text-primary">
            Welcome{driver?.fullName ? `, ${driver.fullName}` : ""}
          </h1>
          <p className="mb-6 text-xs font-semibold text-muted-foreground">
            Live from Firestore — your rides, earnings, and vehicle appear here automatically.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon="📍"
              label={
                <>
                  Total
                  <br />
                  Rides
                </>
              }
              value={totalRides}
            />
            <KpiCard
              icon="✅"
              label={
                <>
                  Completed
                  <br />
                  Rides
                </>
              }
              value={completed}
            />
            <KpiCard icon="⭐" label="Rating" value={driver?.rating ? Number(driver.rating).toFixed(1) : "—"} />
            <KpiCard
              icon="💰"
              label={
                <>
                  Total
                  <br />
                  Earnings (USD)
                </>
              }
              value={(Number(driver?.totalEarnings) || 0).toLocaleString()}
              accent
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 xl:col-span-2">
              <h3 className="mb-4 flex items-center justify-between text-sm font-semibold">
                Recent Rides
                <Link href="/driver/dashboard/rides" className="text-xs font-medium text-primary">
                  View all
                </Link>
              </h3>
              {recentRides.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  No rides yet. Rides will appear here once ride booking is live.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentRides.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{r.passengerName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {r.status || "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Running</div>
                  <div className="text-sm font-semibold">{running}</div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Cancelled</div>
                  <div className="text-sm font-semibold">{cancelled}</div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] text-muted-foreground">Completed</div>
                  <div className="text-sm font-semibold">{completed}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold">Your Vehicle</h3>
              {vehicle ? (
                <div className="text-sm">
                  <div className="font-medium">{vehicle.vehicleType || "—"}</div>
                  <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {vehicle.status || "Available"}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No vehicle assigned yet.</p>
              )}
              <Link href="/driver/dashboard/vehicle" className="mt-4 inline-block text-xs font-medium text-primary">
                View details
              </Link>
            </div>
          </div>
        </>
      )}
    </DriverShell>
  )
}
