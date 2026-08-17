"use client"

import * as React from "react"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DriverShell } from "@/components/driver/driver-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { useAdminClaims } from "@/lib/auth-claims"

const columns: Column[] = [
  { key: "idx", label: "S. No." },
  { key: "payment", label: "Payment ID" },
  { key: "date", label: "Date" },
  { key: "mode", label: "Mode" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
]

const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function toMillis(ts: any) {
  return ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0
}

function KpiCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-5 ${accent ? "bg-primary/10" : "bg-card"}`}>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

export default function DriverEarningsPage() {
  const { driverId, loading: claimsLoading } = useAdminClaims()
  const [driver, setDriver] = React.useState<any>(null)
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)

  // Scoped to this driver's own driverId â see
  // BLAK_IMPLEMENTATION_STATUS.md Phase 5/6. Transactions sorted
  // client-side rather than via a server orderBy so this stays a single
  // equality filter (no new composite index needed). totalEarnings /
  // totalPayout / totalDeduction are read directly off the driver's own
  // record â they are not computed from the transactions list below,
  // since there's no confirmed rule yet for how per-transaction amounts
  // roll up into those totals.
  React.useEffect(() => {
    if (!driverId) {
      setLoading(false)
      return
    }
    const unsubs = [
      onSnapshot(doc(db, "driverApplications", driverId), (snap) => {
        setDriver(snap.exists() ? snap.data() : null)
      }),
      onSnapshot(
        query(collection(db, "transactions"), where("driverId", "==", driverId)),
        (snap) => {
          const next = snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
          next.sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
          setDocs(next)
          setLoading(false)
        },
        () => setLoading(false)
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [driverId])

  const pageCount = Math.max(1, Math.ceil(docs.length / PAGE_SIZE))
  const pagedDocs = docs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => ({
    idx: (page - 1) * PAGE_SIZE + i + 1,
    payment: d.paymentId || id.slice(0, 8).toUpperCase(),
    date: formatDate(d.createdAt),
    mode: d.paymentMode || (d.type === "credit" ? "Online" : "Cash"),
    amount: `${d.type === "debit" ? "-" : ""}$ ${Number(d.amount) || 0}`,
    status: d.status || "Completed",
  }))

  return (
    <DriverShell>
      <PageHeader title="EARNINGS" />
      {claimsLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !driverId ? (
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a driver profile linked to this account.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Total Earnings (USD)" value={(Number(driver?.totalEarnings) || 0).toLocaleString()} accent />
            <KpiCard label="Total Payout (USD)" value={(Number(driver?.totalPayout) || 0).toLocaleString()} />
            <KpiCard label="Total Deductions (USD)" value={(Number(driver?.totalDeduction) || 0).toLocaleString()} />
          </div>
          <p className="mb-4 text-xs font-semibold text-muted-foreground">
            Live from Firestore — payments tied to your account appear here automatically.
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded for your account yet.</p>
          ) : (
            <>
              <DataTable columns={columns} rows={rows} />
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </DriverShell>
  )
}
