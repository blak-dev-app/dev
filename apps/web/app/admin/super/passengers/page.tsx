"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { SendEmailModal } from "@/components/admin/send-email-modal"
import { EditStatusModal } from "@/components/admin/edit-status-modal"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "name", label: "Passenger name" },
  { key: "phone", label: "Mobile" },
  { key: "rides", label: "Total Rides" },
  { key: "joined", label: "Registered on" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function PassengersPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [emailTarget, setEmailTarget] = React.useState<{ id: string; name: string; email?: string } | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<{ id: string; name: string; status: string } | null>(null)

  React.useEffect(() => {
    const q = query(collection(db, "passengers"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const rows = docs.map(({ id, data: d }, i) => {
    const status = d.status || "Active"
    const name = d.fullName || d.name || "—"
    return {
      idx: i + 1,
      name,
      phone: d.phone || "—",
      rides: d.totalRides ?? 0,
      joined: formatDate(d.createdAt),
      status,
      actions: (
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="outline" onClick={() => setEmailTarget({ id, name, email: d.email })}>
            Email
          </Button>
          <Button size="xs" variant="outline" onClick={() => setStatusTarget({ id, name, status })}>
            Edit status
          </Button>
        </div>
      ),
    }
  })

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

      <SendEmailModal
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        recipientName={emailTarget?.name || ""}
        recipientEmail={emailTarget?.email}
        sourceCollection="passengers"
        sourceId={emailTarget?.id || ""}
      />
      <EditStatusModal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.name || ""}
        collectionName="passengers"
        docId={statusTarget?.id || ""}
        currentStatus={statusTarget?.status}
        options={["Active", "Inactive", "Blocked"]}
      />
    </AdminShell>
  )
}
