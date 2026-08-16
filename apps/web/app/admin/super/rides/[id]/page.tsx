"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { ArrowLeft } from "lucide-react"

function formatDateTime(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function RideDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "rides", params.id),
      (snap) => {
        setData(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [params?.id])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-1 size-4" />
        Ride Details
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Ride not found.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold">Booking ID: </span>
              <span className="text-sm text-muted-foreground">
                {data.bookingId || params.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold">Passenger: </span>
              <span className="text-sm text-muted-foreground">{data.passengerName || "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 rounded-lg bg-muted/40 p-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">From: </span>
                {data.from || data.pickup?.address || "—"}
              </div>
              <div>
                <span className="font-semibold">To: </span>
                {data.to || data.drop?.address || "—"}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Distance: </span>
                {data.distance || "—"}
              </div>
              <div>
                <span className="font-semibold">Duration: </span>
                {data.duration || "—"}
              </div>
              <div>
                <span className="font-semibold">Start time: </span>
                {formatDateTime(data.startTime || data.createdAt)}
              </div>
              <div>
                <span className="font-semibold">End time: </span>
                {formatDateTime(data.endTime)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/40 p-4">
            <div className="text-sm">
              <div className="font-semibold">Driver: {data.driverName || "—"}</div>
              <div className="text-muted-foreground">Vehicle: {data.vehicleName || "—"}</div>
              <div className="text-muted-foreground">BLAK ID: {data.blakId || "—"}</div>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Driver rating: </span>
              {data.driverRating ?? "—"}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/40 p-4">
            <div className="text-sm">
              <span className="font-semibold">Amount paid: </span>
              {data.amountPaid != null ? `${data.amountPaid} USD` : "—"}
            </div>
            {data.receiptUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={data.receiptUrl} target="_blank" rel="noreferrer">
                  View Receipt
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No receipt on file</span>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
