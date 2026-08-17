"use client"

import * as React from "react"
import Link from "next/link"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { fleetNavItems } from "@/lib/admin/nav"
import { useAdminClaims } from "@/lib/auth-claims"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "name", label: "Driver name" },
  { key: "driverId", label: "Driver ID" },
  { key: "totalRides", label: "Total Rides" },
  { key: "completedRides", label: "Completed" },
  { key: "completionRate", label: "Completion Rate" },
  { key: "rating", label: "Rating" },
  { key: "actions", label: "Action" },
]

const PAGE_SIZE = 10

function RateBar({ pct }: { pct: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="text-xs font-medium">{pct === null ? "—" : `${pct}%`}</span>
    </div>
  )
}

/**
 * Fleet-scoped driver-by-driver performance table — see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 4 ("Driver performance (per-driver)",
 * "Driver-by-driver analytics table") and Phase 11 ("Driver performance
 * calculations", "Fleet performance aggregation from its own drivers").
 * Both `driverApplications` and `rides` reads use the same
 * where("fleetId","==",fleetId) scoping as every other Fleet Admin page
 * (Phase 2/4); everything below is aggregated client-side from those two
 * already-scoped snapshots rather than issuing a query per driver, so this
 * stays two listeners regardless of fleet size. Ride counts here are the
 * driver's FULL fleet-scoped ride set, not capped to a recent handful —
 * see the companion fix to the Driver Detail page's own trip counters in
 * this same PR.
 */
export default function FleetDriverPerformancePage() {
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [drivers, setDrivers] = React.useState<{ id: string; data: any }[]>([])
  const [rides, setRides] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    if (!fleetId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubs = [
      onSnapshot(query(collection(db, "driverApplications"), where("fleetId", "==", fleetId)), (snap) => {
        setDrivers(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      }),
      onSnapshot(query(collection(db, "rides"), where("fleetId", "==", fleetId)), (snap) => {
        setRides(snap.docs.map((d) => d.data()))
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [fleetId])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const performance = drivers.map(({ id, data: d }) => {
    const driverRides = rides.filter((r) => r.driverId === id)
    const total = driverRides.length
    const completedRides = driverRides.filter((r) => r.status === "Completed").length
    return {
      id,
      name: d.fullName || d.username || "—",
      rating: d.rating,
      reviewCount: d.reviewCount || 0,
      total,
      completedRides,
      completionRate: total ? Math.round((completedRides / total) * 100) : null,
    }
  })

  const filtered = performance.filter((p) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return p.name.toLowerCase().includes(term)
  })

  // Busiest drivers first — this is a ranking view, not a chronological list.
  const sorted = [...filtered].sort((a, b) => b.total - a.total)

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = paged.map((p, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    name: (
      <Link href={`/admin/fleet/drivers/${p.id}`} className="font-medium hover:underline">
        {p.name}
      </Link>
    ),
    driverId: p.id.slice(0, 8).toUpperCase(),
    totalRides: p.total,
    completedRides: p.completedRides,
    completionRate: <RateBar pct={p.completionRate} />,
    rating: p.rating ? `${Number(p.rating).toFixed(1)} (${p.reviewCount})` : "—",
    actions: (
      <Link href={`/admin/fleet/drivers/${p.id}`}>
        <Button size="xs" variant="outline">
          View
        </Button>
      </Link>
    ),
  }))

  return (
    <AdminShell
      navItems={fleetNavItems}
      welcomeName="Fleet Admin"
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <PageHeader title="DRIVER PERFORMANCE" />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — ride counts and completion rate are computed from your fleet&apos;s own rides
        only, not platform-wide totals.
      </p>
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !fleetId ? (
        <p className="text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </p>
      ) : drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drivers have been added to this fleet yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drivers match your search.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </AdminShell>
  )
}
