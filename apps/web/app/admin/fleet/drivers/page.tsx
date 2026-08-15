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
  { key: "name", label: "Driver name" },
  { key: "registered", label: "Registered on" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Action" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetDriversPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const q = query(collection(db, "driverApplications"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            return {
              idx: i + 1,
              name: d.fullName || d.username || "—",
              registered: formatDate(d.createdAt),
              email: d.email || "—",
              mobile: d.phone || "—",
              status: d.status === "Approved" ? "Active" : d.status || "Pending",
              actions: (
                <Button size="xs" variant="outline" asChild>
                  <a href={d.email ? `mailto:${d.email}` : "#"}>Contact</a>
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
        title="DRIVERS"
        actions={
          <Button variant="outline" size="sm">
            Filter by Status ▾
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — drivers onboarded through Join Us appear here automatically.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drivers yet.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}
    </AdminShell>
  )
}
