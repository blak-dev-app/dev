"use client"

import * as React from "react"
import Link from "next/link"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { useSearchParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { fleetNavItems } from "@/lib/admin/nav"
import { useAdminClaims } from "@/lib/auth-claims"
import { Button } from "@blak/ui/components/button"
import { AddQueryModal } from "@/components/admin/add-query-modal"
import { Plus } from "lucide-react"

const STATUS_OPTIONS = ["New", "Open", "In Progress", "On hold", "Closed"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

function FleetQueriesContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "admin"
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  // Unified `tickets` collection (shared with Super Admin's Tickets
  // module, see PRODUCTION_READY_TRACKER.md Phase 2), now also scoped to
  // this fleet's own fleetId — see BLAK_IMPLEMENTATION_STATUS.md Phase 2/4.
  // `audience`/`type` are still filtered client-side (unchanged, avoids a
  // composite index for those two fields); sorting by createdAt is now
  // also done client-side rather than via a server orderBy, so this query
  // stays a single equality filter and doesn't need a NEW composite index
  // on (fleetId, createdAt) on top of that. Tickets created before the
  // Phase 2 fleetId rollout (or via any path that doesn't set fleetId)
  // won't appear here — see Ticket.fleetId in lib/types.ts.
  React.useEffect(() => {
    if (!fleetId) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "tickets"), where("fleetId", "==", fleetId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
        next.sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
        setDocs(next)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [fleetId])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter, type])

  const filtered = docs.filter(
    ({ data: d }) => d.audience === "fleet_admin" && (!d.type || d.type === type)
  )

  const filteredDocs = filtered.filter(({ data: d }) => {
    const status = d.status || "New"
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.subject || ""} ${d.driverName || d.addedBy || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column[] =
    type === "driver"
      ? [
          { key: "idx", label: "S. No." },
          { key: "ticket", label: "Ticket ID" },
          { key: "registered", label: "Registered on" },
          { key: "addedBy", label: "Added by" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ]
      : [
          { key: "idx", label: "S. No." },
          { key: "ticket", label: "Ticket ID" },
          { key: "registered", label: "Registered on" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ]

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    ticket: d.subject || id.slice(0, 8).toUpperCase(),
    registered: formatDate(d.createdAt),
    addedBy: d.driverName || d.addedBy || "—",
    status: d.status || "New",
    actions: (
      <Link href={`/admin/fleet/queries/${id}`}>
        <Button size="xs" variant="outline">
          View
        </Button>
      </Link>
    ),
  }))

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin" searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title={`QUERIES - ${type === "driver" ? "DRIVER" : "ADMIN"}`}
        actions={
          type === "driver" ? (
            <StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAddOpen(true)} disabled={!fleetId}>
                <Plus className="mr-1 size-4" />
                Add a query
              </Button>
              <StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            </div>
          )
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — showing {type === "driver" ? "Driver" : "Admin"} queries.
      </p>
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !fleetId ? (
        <p className="text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No queries yet.</p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No queries match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}

      <AddQueryModal open={addOpen} onClose={() => setAddOpen(false)} fleetId={fleetId} />
    </AdminShell>
  )
}

export default function FleetQueriesPage() {
  return (
    <React.Suspense fallback={null}>
      <FleetQueriesContent />
    </React.Suspense>
  )
}
