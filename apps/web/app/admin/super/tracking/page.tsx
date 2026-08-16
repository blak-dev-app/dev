"use client"

import * as React from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { superNavItems } from "@/lib/admin/nav"

type Doc = Record<string, any>

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006] // NYC

export default function RealTimeTrackingPage() {
  const [rides, setRides] = React.useState<Doc[]>([])
  const mapRef = React.useRef<HTMLDivElement>(null)
  const mapInstance = React.useRef<any>(null)

  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "rides"), orderBy("createdAt", "desc")),
      (snap) => setRides(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return () => unsub()
  }, [])

  const activeRides = rides.filter((r) => r.status === "Running" || r.status === "Ongoing")

  React.useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const cssId = "leaflet-css"
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link")
      link.id = cssId
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    let cancelled = false
    function init() {
      if (cancelled || !mapRef.current || mapInstance.current) return
      const L = (window as any).L
      if (!L) return
      const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 11)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)
      mapInstance.current = map
    }

    if ((window as any).L) {
      init()
    } else {
      const scriptId = "leaflet-js"
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement("script")
        script.id = scriptId
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.async = true
        document.body.appendChild(script)
      }
      script.addEventListener("load", init)
    }

    return () => {
      cancelled = true
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Plot markers for active rides that carry pickup coordinates
  React.useEffect(() => {
    const L = (window as any).L
    const map = mapInstance.current
    if (!L || !map) return
    const markers: any[] = []
    activeRides.forEach((r) => {
      const lat = r.pickupLat ?? r.pickup?.lat
      const lng = r.pickupLng ?? r.pickup?.lng
      if (typeof lat === "number" && typeof lng === "number") {
        const marker = L.marker([lat, lng]).addTo(map)
        marker.bindPopup(`${r.driverName || "Driver"} — ${r.passengerName || "Passenger"}`)
        markers.push(marker)
      }
    })
    return () => markers.forEach((m) => map.removeLayer(m))
  }, [activeRides])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader title="REAL TIME TRACKING" />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — showing rides currently in progress. Map uses OpenStreetMap (no
        API key required); pickup pins appear once ride documents include pickupLat/pickupLng.
      </p>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border xl:col-span-2">
          <div ref={mapRef} className="h-[480px] w-full bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Active Rides ({activeRides.length})</h3>
          {activeRides.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rides in progress right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeRides.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 text-xs">
                  <div className="font-medium">{r.passengerName || "Passenger"}</div>
                  <div className="mt-1 text-muted-foreground">
                    Driver: {r.driverName || "—"} · {r.vehicleName || "—"}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {r.pickup?.address || r.from || "Pickup location pending"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
