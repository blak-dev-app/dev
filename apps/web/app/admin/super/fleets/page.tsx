"use client"

import * as React from "react"
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "name", label: "Fleet name" },
  { key: "owner", label: "Owner" },
  { key: "vehicles", label: "Vehicles" },
  { key: "source", label: "Source" },
  { key: "joined", label: "Registered on" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetsPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const q = query(collection(db, "fleetApplications"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            const status = d.status || "Pending Review"
            const setStatus = (next: string) =>
              updateDoc(doc(db, "fleetApplications", docSnap.id), { status: next }).catch(() => {})
            return {
              idx: i + 1,
              name: d.fleetName || "—",
              owner: d.businessName || "—",
              vehicles: d.vehicles ?? "—",
              source: d.source === "rideblak.com" ? "rideblak.com" : "Website",
              joined: formatDate(d.createdAt),
              status,
              actions:
                status === "Pending Review" ? (
                  <div className="flex gap-2">
                    <Button size="xs" variant="outline" onClick={() => setStatus("Approved")}>
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-destructive text-destructive"
                      onClick={() => setStatus("Rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  "—"
                ),
            }
          })
        )
        setLoading(false)
      },
      () => {
        setError("Could not load fleet applications.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader
        title="FLEETS"
        actions={
          <>
            <Button variant="outline" size="sm">
              Filter by Status ▾
            </Button>
            <Button size="sm">+ Add Fleet</Button>
          </>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Join Us — Register as a Fleet, and rideblak.com Operator Network submissions
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fleet registrations yet. New submissions will appear here automatically.
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
