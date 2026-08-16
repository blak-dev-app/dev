"use client"

import * as React from "react"
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { X } from "lucide-react"

export function AssignDriverModal({
  open,
  onClose,
  vehicleId,
  vehicleLabel,
}: {
  open: boolean
  onClose: () => void
  vehicleId: string
  vehicleLabel?: string
}) {
  const [drivers, setDrivers] = React.useState<{ id: string; data: any }[]>([])
  const [selected, setSelected] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const q = query(collection(db, "driverApplications"), where("status", "in", ["Approved", "Active"]))
    const unsub = onSnapshot(q, (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, data: d.data() }))), () =>
      setDrivers([])
    )
    return () => unsub()
  }, [open])

  if (!open) return null

  async function handleAssign() {
    if (!selected) return
    setSaving(true)
    try {
      const driver = drivers.find((d) => d.id === selected)
      await updateDoc(doc(db, "vehicles", vehicleId), {
        driverId: selected,
        driverName: driver?.data.fullName || driver?.data.username || "—",
        status: "Driver Assigned",
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Assign driver{vehicleLabel ? ` — ${vehicleLabel}` : ""}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {drivers.length === 0 ? (
          <p className="mb-4 text-xs text-muted-foreground">No available drivers to assign right now.</p>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            {drivers.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="driver"
                  value={d.id}
                  checked={selected === d.id}
                  onChange={() => setSelected(d.id)}
                />
                {d.data.fullName || d.data.username || "—"}
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!selected || saving} onClick={handleAssign}>
            {saving ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  )
}
