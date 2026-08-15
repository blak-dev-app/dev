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
  { key: "booking", label: "Booking ID" },
  { key: "booked", label: "Booked on" },
  { key: "passenger", label: "Passenger" },
  { key: "driver", label: "Driver" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Action" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetRidesPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const q = query(collection(db, "rides"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            return {
              idx: i + 1,
              booking: d.bookingId || docSnap.id.slice(0, 8).toUpperCase(),
              booked: formatDate(d.createdAt),
              passenger: d.passengerName || "—",
              driver: d.driverName || "—",
              status: d.status || "Ongoing",
              actions: (
                <Button size="xs" variant="outline" disabled>
                  Track ride
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
        title="RIDES"
        actions={
          <Button variant="outline" size="sm">
            Filter by Status ▾
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — rides booked through your fleet appear here automatically.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rides yet. Rides will appear here once ride booking is live.
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
