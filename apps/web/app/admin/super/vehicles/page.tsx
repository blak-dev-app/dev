"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { SendEmailModal } from "@/components/admin/send-email-modal"
import { EditStatusModal } from "@/components/admin/edit-status-modal"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "added", label: "Added on" },
  { key: "fleet", label: "Fleet" },
  { key: "driver", label: "Driver" },
  { key: "driverId", label: "Driver ID" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

const STATUS_OPTIONS = ["Available", "On Trip", "Inactive"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function VehiclesPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [emailTarget, setEmailTarget] = React.useState<{ id: string; name: string; email?: string } | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<{ id: string; name: string; status: string } | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const q = query(collection(db, "vehicles"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
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
    const status = d.status || "Available"
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.fleetName || ""} ${d.driverName || ""} ${d.driverId || ""} ${d.driverEmail || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => {
    const status = d.status || "Available"
    const name = d.driverName || d.vehicleName || `Vehicle ${i + 1}`
    return {
      idx: (page - 1) * PAGE_SIZE + i + 1,
      added: formatDate(d.createdAt),
      fleet: d.fleetName || "—",
      driver: d.driverName || "—",
      driverId: d.driverId || "—",
      status,
      actions: (
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/super/vehicles/${id}`}>
            <Button size="xs" variant="outline">
              View
            </Button>
          </Link>
          <Button size="xs" variant="outline" onClick={() => setEmailTarget({ id, name, email: d.driverEmail })}>
            Email
          </Button>
          <Button size="xs" variant="outline" onClick={() => setStatusTarget({ id, name, status })}>
            Edit status
          </Button>
        </div>
      ),
    }
  })

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin" searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title="VEHICLES"
        actions={
          <>
            <StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            <Button size="sm">+ Add Vehicle</Button>
          </>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from the vehicles registry — no vehicles have been added yet.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No vehicles yet. Vehicles added by fleets will appear here automatically.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No vehicles match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}

      <SendEmailModal
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        recipientName={emailTarget?.name || ""}
        recipientEmail={emailTarget?.email}
        sourceCollection="vehicles"
        sourceId={emailTarget?.id || ""}
      />
      <EditStatusModal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.name || ""}
        collectionName="vehicles"
        docId={statusTarget?.id || ""}
        currentStatus={statusTarget?.status}
        options={["Available", "On Trip", "Inactive"]}
      />
    </AdminShell>
  )
}
