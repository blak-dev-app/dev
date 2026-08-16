"use client"

import * as React from "react"
import Link from "next/link"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "ticket", label: "Subject" },
  { key: "registered", label: "Registered on" },
  { key: "addedBy", label: "Added by" },
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

export default function TicketsPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    // Unified `tickets` collection (shared with Fleet Admin's Queries module,
    // see PRODUCTION_READY_TRACKER.md Phase 2). `audience` filtered
    // client-side — same reasoning as Fleet Admin's Queries page — to avoid
    // requiring a Firestore composite index.
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(
          snap.docs
            .filter((docSnap) => docSnap.data().audience === "super_admin")
            .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
        )
        setLoading(false)
      },
      () => {
        setError("Could not load tickets.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const filteredDocs = docs.filter(({ data: d }) => {
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

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    ticket: d.subject || "—",
    registered: formatDate(d.createdAt),
    addedBy: d.driverName || d.addedBy || "Driver App",
    status: d.status || "New",
    actions: (
      <Link href={`/admin/super/tickets/${id}`}>
        <Button size="xs" variant="outline">
          View
        </Button>
      </Link>
    ),
  }))

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin" searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title="TICKETS"
        actions={<StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />}
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Driver App — Raise a Ticket submissions
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No support tickets yet. New Driver App submissions will appear here automatically.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tickets match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </AdminShell>
  )
}
