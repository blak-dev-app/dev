"use client"

import * as React from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { X } from "lucide-react"

export function AddTicketModal({
  open,
  onClose,
  driverId,
  driverName,
  fleetId,
}: {
  open: boolean
  onClose: () => void
  /**
   * The signed-in driver's own driverId/name/fleetId (from
   * useAdminClaims() + their driverApplications doc), passed down by the
   * page so this modal never has to resolve them itself. `fleetId` decides
   * which admin surface the ticket routes to: a driver who belongs to a
   * fleet raises it with their Fleet Admin (audience: "fleet_admin",
   * visible on the Fleet Queries "Driver" tab); an independent driver with
   * no fleetId raises it directly with BLAK (audience: "super_admin") â
   * see BLAK_IMPLEMENTATION_STATUS.md Phase 5/12.
   */
  driverId?: string | null
  driverName?: string | null
  fleetId?: string | null
}) {
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !driverId) return
    setSaving(true)
    try {
      await addDoc(collection(db, "tickets"), {
        audience: fleetId ? "fleet_admin" : "super_admin",
        type: "driver",
        driverId,
        driverName: driverName || "Driver",
        ...(fleetId ? { fleetId } : {}),
        subject,
        message,
        status: "New",
        addedBy: driverName || "Driver",
        createdAt: serverTimestamp(),
      })
      setSubject("")
      setMessage("")
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Raise a ticket</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="mb-3 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <input
            className="rounded-lg border border-border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <textarea
            className="min-h-24 rounded-lg border border-border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving || !driverId}>
            {saving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  )
}
