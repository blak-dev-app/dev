"use client"

import * as React from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { fleetNavItems } from "@/lib/admin/nav"
import { useAdminClaims } from "@/lib/auth-claims"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "payment", label: "Payment ID" },
  { key: "date", label: "Transaction Date" },
  { key: "paidBy", label: "Paid By" },
  { key: "mode", label: "Payment Mode" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
]

const STATUS_OPTIONS = ["Completed", "Pending", "Failed"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

export default function FleetPaymentsPage() {
  const { fleetId, loading: claimsLoading } = useAdminClaims()
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  // Scoped to this fleet's own fleetId — see BLAK_IMPLEMENTATION_STATUS.md
  // Phase 4/10. Sorted client-side rather than via a server orderBy so this
  // stays a single equality filter (no new composite index needed).
  // Transactions created before the Phase 2 fleetId rollout have no
  // fleetId and won't appear here — see Transaction.fleetId in lib/types.ts.
  React.useEffect(() => {
    if (!fleetId) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "transactions"), where("fleetId", "==", fleetId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
        next.sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
        setDocs(next)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [fleetId])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const filteredDocs = docs.filter(({ data: d }) => {
    const status = d.status || "Completed"
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.paymentId || ""} ${d.name || ""} ${d.mode || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    payment: d.paymentId || id.slice(0, 8).toUpperCase(),
    date: formatDate(d.createdAt),
    paidBy: d.name || "—",
    mode: d.mode || (d.type === "credit" ? "Online" : "Cash"),
    amount: `$ ${Number(d.amount) || 0}`,
    status: d.status || "Completed",
  }))

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin" searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <PageHeader
        title="PAYMENTS"
        actions={<StatusFilter options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />}
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — payments processed for your fleet appear here automatically.
      </p>
      {claimsLoading || loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !fleetId ? (
        <p className="text-sm text-muted-foreground">
          This account isn&apos;t linked to a fleet yet. Contact BLAK Super Admin to have your fleet
          profile connected to this login.
        </p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments for this fleet yet.</p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payments match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </AdminShell>
  )
}
