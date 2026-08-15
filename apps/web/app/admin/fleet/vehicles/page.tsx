"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { fleetNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "added", label: "Added on" },
  { key: "driver", label: "Driver name" },
  { key: "driverId", label: "Driver ID" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Action" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetVehiclesPage() {
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
            const status = d.status || "Available"
            return {
              idx: i + 1,
              added: formatDate(d.createdAt),
              driver: d.driverName || "—",
              driverId: d.driverId || "—",
              status,
              actions: (
                <Button size="xs" variant="outline">
                  {status === "Driver Assigned" ? "Reassign" : "Assign"}
                </Button>
              ),
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
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <PageHeader
        title="VEHICLES"
        actions={
          <Button variant="outline" size="sm">
            Filter by Status ▾
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — vehicles added to your fleet appear here automatically.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles yet.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}
    </AdminShell>
  )
}
