"use client"

import * as React from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { X } from "lucide-react"

export function AddQueryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) return
    setSaving(true)
    try {
      // Writes to the unified `tickets` collection (shared with Super Admin's
      // Tickets module). `audience` controls which dashboard shows this ticket;
      // `type` controls the Admin/Driver sub-view within Fleet Admin's Queries page.
      await addDoc(collection(db, "tickets"), {
        audience: "fleet_admin",
        type: "admin",
        subject,
        message,
        status: "New",
        addedBy: "Fleet Admin",
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
          <h3 className="text-sm font-semibold">Add a query</h3>
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
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  )
}
