"use client"

import * as React from "react"
import Link from "next/link"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { fleetNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "name", label: "Driver name" },
  { key: "driverId", label: "Driver ID" },
  { key: "registered", label: "Registered on" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Action" },
]

const STATUS_OPTIONS = ["Active", "Pending Review", "Documents Submitted", "Invited", "Rejected"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function displayStatus(d: any) {
  return d.status === "Approved" ? "Active" : d.status || "Pending"
}

export default function FleetDriversPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const q = query(collection(db, "driverApplications"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const filteredDocs = docs.filter(({ data: d }) => {
    const status = displayStatus(d)
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.fullName || d.username || ""} ${d.email || ""} ${d.phone || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    name: (
      <Link href={`/admin/fleet/drivers/${id}`} className="font-medium hover:underline">
        {d.fullName || d.username || "—"}
      </Link>
    ),
    driverId: id.slice(0, 8).toUpperCase(),
    registered: formatDate(d.createdAt),
    email: d.email || "—",
    mobile: d.phone || "—",
    status: displayStatus(d),
    actions: (
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/fleet/drivers/${id}`}>
          <Button size="xs" variant="outline">
            View
          </Button>
        </Link>
        <Button size="xs" variant="outline" asChild>
          <a href={d.email ? `mailto:${d.email}` : "#"}>Contact</a>
        </Button>
      </div>
    ),
  }))

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin" searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title="DRIVERS"
        actions={<StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />}
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — drivers onboarded through Join Us appear here automatically.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drivers yet.</p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No drivers match your {isFiltered ? "search/filter" : "search"}.
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
