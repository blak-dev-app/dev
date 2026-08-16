"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "paymentId", label: "Payment ID" },
  { key: "bookingId", label: "Booking ID" },
  { key: "date", label: "Transaction Date" },
  { key: "paidBy", label: "Paid By" },
  { key: "userType", label: "Usertype" },
  { key: "mode", label: "Payment Mode" },
  { key: "status", label: "Status" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function SuperPaymentsPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc")),
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
    paymentId: d.paymentId || id.slice(0, 8).toUpperCase(),
    bookingId: d.bookingId || "—",
    date: formatDate(d.createdAt),
    paidBy: d.name || d.paidBy || "—",
    userType: d.userType || "—",
    mode: d.paymentMode || (d.type === "credit" ? "Online" : "Cash"),
    status: d.status || (d.type === "credit" ? "Completed" : "Pending"),
  }))

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader title="PAYMENTS" />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — showing all platform transactions.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}
    </AdminShell>
  )
}
