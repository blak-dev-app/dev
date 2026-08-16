"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "booking", label: "Booking ID" },
  { key: "booked", label: "Booked on" },
  { key: "passenger", label: "Passenger" },
  { key: "driver", label: "Driver" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

export default function SuperRidesPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "rides"), orderBy("createdAt", "desc")),
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const rows = docs.map(({ id, data: d }, i) => ({
    idx: i + 1,
    booking: d.bookingId || id.slice(0, 8).toUpperCase(),
    booked: formatDate(d.createdAt),
    passenger: d.passengerName || "—",
    driver: d.driverName || "—",
    status: d.status || "Pending",
    action: (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/super/rides/${id}`}>View Details</Link>
      </Button>
    ),
  }))

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader title="RIDES" />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — rides booked through the platform will appear here automatically.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rides yet.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}
    </AdminShell>
  )
}
