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
  { key: "ticket", label: "Subject" },
  { key: "registered", label: "Registered on" },
  { key: "addedBy", label: "Added by" },
  { key: "status", label: "Status" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function TicketsPage() {
  const [rows, setRows] = React.useState<Record<string, React.ReactNode>[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const q = query(collection(db, "driverTickets"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((docSnap, i) => {
            const d = docSnap.data()
            return {
              idx: i + 1,
              ticket: d.subject || "—",
              registered: formatDate(d.createdAt),
              addedBy: "Driver App",
              status: "New",
            }
          })
        )
        setLoading(false)
      },
      () => {
        setError("Could not load tickets.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader
        title="TICKETS"
        actions={
          <Button variant="outline" size="sm">
            Filter by Status ▾
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Driver App — Raise a Ticket submissions
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No support tickets yet. New Driver App submissions will appear here automatically.
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
