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
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [trips, setTrips] = React.useState<{ id: string; data: any }[]>([])

  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "vehicles", params.id),
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
    const q = query(
      collection(db, "rides"),
      where("vehicleId", "==", params.id),
      orderBy("createdAt", "desc")
    )
    const unsub = onSnapshot(
      q,
      (snap) => setTrips(snap.docs.slice(0, 5).map((d) => ({ id: d.id, data: d.data() }))),
      () => setTrips([])
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
        Vehicle Details
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Vehicle not found.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex flex-wrap items-start gap-6">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-muted-foreground">
              {data.driverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.driverPhotoUrl} alt={data.driverName || "Driver"} className="size-full object-cover" />
              ) : (
                "Photo"
              )}
            </div>
            <div className="flex-1 space-y-1 text-sm">
              <div className="text-base font-semibold">{data.driverName || "—"}</div>
              <div className="text-muted-foreground">Driver ID: {data.driverId || "—"}</div>
              <div className="text-muted-foreground">Vehicle name: {data.vehicleName || "—"}</div>
              <div className="text-muted-foreground">Vehicle type: {data.vehicleType || "—"}</div>
              <div className="text-muted-foreground">Insurance number: {data.insuranceNumber || "—"}</div>
            </div>
            <div className="w-full max-w-xs overflow-hidden rounded-lg bg-muted sm:w-48">
              {data.vehicleImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.vehicleImageUrl} alt={data.vehicleName || "Vehicle"} className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Vehicle image
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Miles Travelled</div>
              <div className="text-lg font-semibold">{data.totalMiles ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Trips</div>
              <div className="text-lg font-semibold">{total}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-lg font-semibold">{completed}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
              <div className="text-lg font-semibold">{cancelled}</div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Last few trips</h3>
            {trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">No trips recorded for this vehicle yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Booking ID</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Passenger</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(({ id, data: t }) => (
                      <tr key={id} className="border-t border-border">
                        <td className="px-3 py-2">{t.bookingId || id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-3 py-2">{formatDate(t.createdAt)}</td>
                        <td className="px-3 py-2">{t.passengerName || "—"}</td>
                        <td className="px-3 py-2">{t.status || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" size="sm">
              Reassign
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
