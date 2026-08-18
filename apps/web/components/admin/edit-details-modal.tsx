"use client"

import * as React from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"

export type EditableField = {
  key: string
  label: string
  type?: "text" | "email" | "tel"
}

type EditDetailsModalProps = {
  open: boolean
  onClose: () => void
  title: string
  collectionName: string
  docId: string
  fields: EditableField[]
  current: Record<string, unknown>
}

/**
 * Super Admin: correct the details on a fleet or driver record.
 *
 * Why this exists: there was no way to fix a fleet's name, contact email or
 * phone number anywhere in the console. A typo made at signup was permanent,
 * and the fleet's own profile page tells them "To update these details,
 * contact BLAK Super Admin" — advice that pointed at a capability nobody had.
 *
 * Two deliberate choices, both reactions to bugs found in this codebase:
 *
 *  1. FAILURES ARE SHOWN, NEVER SWALLOWED. Several actions in this project
 *     wrapped their writes in a bare try/catch and reported success either
 *     way — that is how the dead email queue went unnoticed for weeks. If the
 *     write is rejected, the real reason is rendered in the dialog and the
 *     dialog stays open with the user's input intact.
 *
 *  2. ONLY CHANGED FIELDS ARE WRITTEN. The patch is built by diffing against
 *     the current values, so an untouched field is not included in the update
 *     at all. Sending back every field would overwrite concurrent edits and
 *     would rewrite values this form never displayed.
 *
 * A note on Firestore rules: `super_admin` is unconditionally allowed to update
 * driverApplications and fleetApplications. That was not true until 2026-08-18
 * — the `status != "Active"` guard was accidentally binding to the super_admin
 * branch too, so writes to any Active record were denied. This component would
 * have silently failed on exactly the records most worth correcting.
 */
export function EditDetailsModal({
  open,
  onClose,
  title,
  collectionName,
  docId,
  fields,
  current,
}: EditDetailsModalProps) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  // Re-seed from the live document every time the dialog opens, so it never
  // shows values left over from a previous edit or from a stale snapshot.
  React.useEffect(() => {
    if (!open) return
    const seeded: Record<string, string> = {}
    for (const field of fields) {
      const raw = current?.[field.key]
      seeded[field.key] = raw === null || raw === undefined ? "" : String(raw)
    }
    setValues(seeded)
    setError("")
  }, [open, docId])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Diff against what is currently stored — untouched fields are omitted.
    const patch: Record<string, string> = {}
    for (const field of fields) {
      const before = current?.[field.key]
      const beforeStr = before === null || before === undefined ? "" : String(before)
      const after = (values[field.key] ?? "").trim()
      if (after !== beforeStr) patch[field.key] = after
    }

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, collectionName, docId), patch)
      onClose()
    } catch (err) {
      // Surfaced, not swallowed. A permission failure and a network failure are
      // different problems and the operator should be able to tell them apart.
      const code = (err as { code?: string } | null)?.code
      const message = (err as { message?: string } | null)?.message
      setError(
        code === "permission-denied"
          ? "You don't have permission to change this record."
          : message || "Couldn't save those changes. Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6"
      >
        <h3 className="mb-1 text-sm font-semibold">Edit details — {title}</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Only the fields you change are saved.
        </p>

        <div className="flex flex-col gap-3">
          {fields.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
              <input
                type={field.type || "text"}
                value={values[field.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </label>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Turns a document map key like `businessLicense` into `Business license`.
 *
 * Used by the Super Admin detail pages to list the documents a fleet or driver
 * has ACTUALLY uploaded. Those pages previously rendered a hardcoded list —
 * `["Passport", "Insurance", "Address proof"]` — each with a green tick,
 * regardless of what was on the record. Every fleet and every driver therefore
 * appeared to have all three documents verified, including ones that had
 * uploaded nothing at all. That is fabricated data on the screen an admin uses
 * to decide whether to approve an operator.
 *
 * Deriving the labels from the stored keys rather than a fixed list also means
 * this cannot drift: whatever the upload flow writes is what gets shown.
 */
export function humanizeDocKey(key: string) {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
