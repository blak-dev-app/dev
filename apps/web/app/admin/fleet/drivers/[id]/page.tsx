"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { fleetNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { ArrowLeft, Check } from "lucide-react"

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetDriverDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [trips, setTrips] = React.useState<{ id: string; data: any }[]>([])

  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "driverApplications", params.id),
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
    const q = query(collection(db, "rides"), where("driverId", "==", params.id), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => setTrips(snap.docs.slice(0, 5).map((d) => ({ id: d.id, data: d.data() }))), () =>
      setTrips([])
    )
    return () => unsub()
  }, [params?.id])

  const total = trips.length
  const completed = trips.filter((t) => t.data.status === "Completed").length
  const cancelled = trips.filter((t) => t.data.status === "Cancelled").length

  return (
    <AdminShell navItems={fleetNavItems} welcomeName="Fleet Admin">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-1 size-4" />
        Driver Detail
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Driver not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">{data.fullName || data.username || "—"}</div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {data.status || "Pending Review"}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="inline font-semibold">Driver ID: </dt>
                <dd className="inline text-muted-foreground">{params.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Full name: </dt>
                <dd className="inline text-muted-foreground">{data.fullName || "—"}</dd>
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
                <dt className="inline font-semibold">Full address: </dt>
                <dd className="inline text-muted-foreground">{data.address || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Passport number or ID: </dt>
                <dd className="inline text-muted-foreground">{data.passportId || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Social security number: </dt>
                <dd className="inline text-muted-foreground">{data.ssn || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Insurance number: </dt>
                <dd className="inline text-muted-foreground">{data.insuranceNumber || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Vehicle type: </dt>
                <dd className="inline text-muted-foreground">{data.vehicleType || "—"}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold">Document list</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {["Passport", "Insurance", "Address proof"].map((doc) => (
                  <li key={doc} className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-500" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Button size="sm" variant="outline" asChild className="w-full">
                <a href={data.email ? `mailto:${data.email}` : "#"}>Contact</a>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Ratings and Review</h3>
            <div className="mb-6 text-center">
              <div className="text-3xl font-semibold">{data.rating ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{data.reviewCount ?? 0} Reviews</div>
            </div>
            <h3 className="mb-4 text-sm font-semibold">Trip overview</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{total}</div>
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
                <div className="text-lg font-semibold">{data.totalEarnings ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Earnings</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalPayout ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Payout</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalDeduction ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Deduction</div>
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
