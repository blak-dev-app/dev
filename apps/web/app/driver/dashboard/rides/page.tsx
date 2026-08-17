"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { useAdminClaims } from "@/lib/auth-claims"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "booking", label: "Booking ID" },
  { key: "booked", label: "Booked on" },
  { key: "passenger", label: "Passenger" },
  { key: "fare", label: "Fare" },
  { key: "status", label: "Status" },
]

const STATUS_OPTIONS = ["Pending", "Running", "Completed", "Cancelled"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

export default function DriverRidesPage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  // Scoped to this driver's own driverId â see
  // BLAK_IMPLEMENTATION_STATUS.md Phase 5. Sorted client-side rather than
  // via a server orderBy so this stays a single equality filter and
  // doesn't need a new Firestore composite index on (driverId, createdAt)
  // â same pattern used throughout the Fleet Admin pages (Phase 4).
  React.useEffect(() => {
    if (!driverId) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "rides"), where("driverId", "==", driverId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
        next.sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
        setDocs(next)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [driverId])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const filteredDocs = docs.filter(({ data: d }) => {
    const status = d.status || "Pending"
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.bookingId || ""} ${d.passengerName || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    booking: d.bookingId || id.slice(0, 8).toUpperCase(),
    booked: formatDate(d.createdAt),
    passenger: d.passengerName || "—",
    fare: d.amountPaid != null ? `$ ${Number(d.amountPaid)}` : "—",
    status: d.status || "Pending",
  }))

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <DriverShell searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title="MY RIDES"
        actions={<StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />}
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — rides assigned to you appear here automatically.
      </p>
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rides yet. Rides will appear here once ride booking is live.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rides match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </DriverShell>
  )
}
