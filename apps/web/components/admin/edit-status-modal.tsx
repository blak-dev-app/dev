"use client"

import * as React from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"

type EditStatusModalProps = {
  open: boolean
  onClose: () => void
  title: string
  collectionName: string
  docId: string
  currentStatus?: string
  options?: string[]
}

export function EditStatusModal({
  open,
  onClose,
  title,
  collectionName,
  docId,
  currentStatus,
  options = ["Approved", "Pending", "Rejected"],
}: EditStatusModalProps) {
  const [value, setValue] = React.useState(currentStatus || options[0])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setValue(currentStatus || options[0])
  }, [currentStatus, open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateDoc(doc(db, collectionName, docId), { status: value })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">Edit status — {title}</h3>
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                value={opt}
                checked={value === opt}
                onChange={() => setValue(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  )
}
