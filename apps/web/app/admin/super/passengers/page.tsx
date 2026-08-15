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
  { key: "name", label: "Passenger name" },
  { key: "phone", label: "Mobile" },
  { key: "rides", label: "Total Rides" },
  { key: "joined", label: "Registered on" },
  { key: "status", label: "Status" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function PassengersPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const q = query(collection(db, "passengers"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            return {
              idx: i + 1,
              name: d.fullName || d.name || "—",
              phone: d.phone || "—",
              rides: d.totalRides ?? 0,
              joined: formatDate(d.createdAt),
              status: d.status || "Active",
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
        title="PASSENGERS"
        actions={
          <Button variant="outline" size="sm">
            Filter by Status ▾
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from the passenger app signups — no passengers have registered yet.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No passengers yet. New registrations will appear here automatically.
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
