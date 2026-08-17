"use client"

import * as React from "react"
import Link from "next/link"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { AddTicketModal } from "@/components/driver/add-ticket-modal"
import { useAdminClaims } from "@/lib/auth-claims"
import { Button } from "@blak/ui/components/button"
import { Plus } from "lucide-react"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "ticket", label: "Ticket ID" },
  { key: "registered", label: "Registered on" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

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

export default function DriverSupportPage() {
  const { driverId, fleetId, loading: claimsLoading } = useAdminClaims()
  const [driver, setDriver] = React.useState<any>(null)
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  // Scoped to this driver's own driverId (works for tickets raised with
  // either audience, "fleet_admin" or "super_admin" — firestore.rules
  // allows a driver to read any ticket where resource.data.driverId ==
  // myDriverId()). Sorted client-side, no server orderBy, so this stays a
  // single equality filter — see BLAK_IMPLEMENTATION_STATUS.md Phase 5.
  React.useEffect(() => {
    if (!driverId) {
      setLoading(false)
      return
    }
    const unsubs = [
      onSnapshot(doc(db, "driverApplications", driverId), (snap) => {
        setDriver(snap.exists() ? snap.data() : null)
      }),
      onSnapshot(
        query(collection(db, "tickets"), where("driverId", "==", driverId)),
        (snap) => {
          const next = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
          next.sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
          setDocs(next)
          setLoading(false)
        },
        () => setLoading(false)
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [driverId])

  React.useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const filteredDocs = docs.filter(({ data: d }) => {
    if (!statusFilter) return true
    return (d.status || "New") === statusFilter
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    ticket: d.subject || id.slice(0, 8).toUpperCase(),
    registered: formatDate(d.createdAt),
    status: d.status || "New",
    actions: (
      <Link href={`/driver/dashboard/support/${id}`}>
        <Button size="xs" variant="outline">
          View
        </Button>
      </Link>
    ),
  }))

  const isFiltered = Boolean(statusFilter)

  return (
    <DriverShell welcomeName={driver?.fullName}>
      <PageHeader
        title="SUPPORT"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={!driverId}>
              <Plus className="mr-1 size-4" />
              Raise a ticket
            </Button>
            <StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
          </div>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — tickets you&apos;ve raised appear here automatically.
      </p>
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tickets yet. Raise a ticket if you need help from your fleet admin or BLAK support.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tickets match your {isFiltered ? "filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}

      <AddTicketModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        driverId={driverId}
        driverName={driver?.fullName}
        fleetId={fleetId}
      />
    </DriverShell>
  )
}
