"use client"

import * as React from "react"
import Link from "next/link"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { useSearchParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { fleetNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { AddQueryModal } from "@/components/admin/add-query-modal"
import { Plus } from "lucide-react"

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function FleetQueriesContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "admin"
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)

  React.useEffect(() => {
    const q = query(collection(db, "queries"), orderBy("createdAt", "desc"))
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

  const filtered = docs.filter(({ data: d }) => !d.type || d.type === type)

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

  const rows = filtered.map(({ id, data: d }, i) => ({
    idx: i + 1,
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

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <PageHeader
        title={`QUERIES - ${type === "driver" ? "DRIVER" : "ADMIN"}`}
        actions={
          type === "driver" ? (
            <Button variant="outline" size="sm">
              Filter by Status ▾
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1 size-4" />
                Add a query
              </Button>
              <Button variant="outline" size="sm">
                Filter by Status ▾
              </Button>
            </div>
          )
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — showing {type === "driver" ? "Driver" : "Admin"} queries.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No queries yet.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}

      <AddQueryModal open={addOpen} onClose={() => setAddOpen(false)} />
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
