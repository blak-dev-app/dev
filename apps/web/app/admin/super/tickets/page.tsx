"use client"

import * as React from "react"
import Link from "next/link"
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
  { key: "actions", label: "Actions" },
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
    // Unified `tickets` collection (shared with Fleet Admin's Queries module,
    // see PRODUCTION_READY_TRACKER.md Phase 2). `audience` filtered
    // client-side — same reasoning as Fleet Admin's Queries page — to avoid
    // requiring a Firestore composite index.
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs
            .filter((docSnap) => docSnap.data().audience === "super_admin")
            .map((docSnap, i) => {
              const d = docSnap.data()
              return {
                idx: i + 1,
                ticket: d.subject || "—",
                registered: formatDate(d.createdAt),
                addedBy: d.driverName || d.addedBy || "Driver App",
                status: d.status || "New",
                actions: (
                  <Link href={`/admin/super/tickets/${docSnap.id}`}>
                    <Button size="xs" variant="outline">
                      View
                    </Button>
                  </Link>
                ),
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
