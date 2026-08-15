"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "added", label: "Added on" },
  { key: "fleet", label: "Fleet" },
  { key: "driver", label: "Driver" },
  { key: "driverId", label: "Driver ID" },
  { key: "status", label: "Status" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function VehiclesPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const q = query(collection(db, "vehicles"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            return {
              idx: i + 1,
              added: formatDate(d.createdAt),
              fleet: d.fleetName || "—",
              driver: d.driverName || "—",
              driverId: d.driverId || "—",
              status: d.status || "Available",
            }
          })
        )
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader
        title="VEHICLES"
        actions={
          <>
            <Button variant="outline" size="sm">
              Filter by Status ▾
            </Button>
            <Button size="sm">+ Add Vehicle</Button>
          </>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from the vehicles registry — no vehicles have been added yet.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No vehicles yet. Vehicles added by fleets will appear here automatically.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}
    </AdminShell>
  )
}
