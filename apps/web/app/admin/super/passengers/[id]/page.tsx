"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { ArrowLeft } from "lucide-react"

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function PassengerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [trips, setTrips] = React.useState<{ id: string; data: any }[]>([])

  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "passengers", params.id),
      (snap) => {
        setData(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [params?.id])

  React.useEffect(() => {
    if (!params?.id) return
    const q = query(collection(db, "rides"), where("passengerId", "==", params.id), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => setTrips(snap.docs.slice(0, 5).map((d) => ({ id: d.id, data: d.data() }))), () =>
      setTrips([])
    )
    return () => unsub()
  }, [params?.id])

  const total = trips.length
  const completed = trips.filter((t) => t.data.status === "Completed").length
  const cancelled = trips.filter((t) => t.data.status === "Cancelled").length

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-1 size-4" />
        Passenger Details
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Passenger not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">{data.fullName || data.name || "—"}</div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {data.status || "Active"}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="inline font-semibold">Full name: </dt>
                <dd className="inline text-muted-foreground">{data.fullName || data.name || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Email ID: </dt>
                <dd className="inline text-muted-foreground">{data.email || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Phone number: </dt>
                <dd className="inline text-muted-foreground">{data.phone || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Passport number or ID: </dt>
                <dd className="inline text-muted-foreground">{data.passportId || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Reviews</h3>
            <div className="mb-6 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.reviewsGiven ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Reviews given</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.reviewsReceived ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Review received</div>
              </div>
            </div>
            <h3 className="mb-4 text-sm font-semibold">Trip overview</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{total || data.totalRides || 0}</div>
                <div className="text-xs text-muted-foreground">Total Trips</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{cancelled}</div>
                <div className="text-xs text-muted-foreground">Cancelled</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Payments</h3>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalPayment ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Payment</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.dueAmount ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Due Amount</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.refunds ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Refunds</div>
              </div>
            </div>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Last few transactions</h4>
            {trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">No trips yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {trips.map(({ id, data: t }) => (
                  <li key={id} className="flex items-center justify-between border-t border-border pt-2">
                    <span>{t.from || "—"} to {t.to || "—"}</span>
                    <span className="text-muted-foreground">{formatDate(t.createdAt)}</span>
                    <span className="font-semibold">{t.amountPaid ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
