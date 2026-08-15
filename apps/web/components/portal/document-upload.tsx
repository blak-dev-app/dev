"use client"

import * as React from "react"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { Label } from "@blak/ui/components/label"

export type DocType = { key: string; label: string }

export function DocumentUpload({
  collection,
  applicationId,
  docTypes,
  storagePrefix,
  existingDocuments,
}: {
  collection: "driverApplications" | "fleetApplications"
  applicationId: string
  docTypes: DocType[]
  storagePrefix: string
  existingDocuments?: Record<string, { url: string }>
}) {
  const [files, setFiles] = React.useState<Record<string, File | null>>({})
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const missing = docTypes.filter(
      (d) => !existingDocuments?.[d.key] && !files[d.key]
    )
    if (missing.length > 0) {
      setError(`Please upload: ${missing.map((d) => d.label).join(", ")}`)
      return
    }

    setUploading(true)
    try {
      const updates: Record<string, unknown> = {}

      for (const docType of docTypes) {
        const file = files[docType.key]
        if (!file) continue
        const path = `${storagePrefix}/${docType.key}-${file.name}`
        const fileRef = ref(storage, path)
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)
        updates[`documents.${docType.key}`] = { url, uploadedAt: new Date().toISOString() }
      }

      await updateDoc(doc(db, collection, applicationId), {
        ...updates,
        status: "Documents Submitted",
        submittedAt: serverTimestamp(),
      })

      setSubmitted(true)
    } catch (err) {
      console.error("document upload failed:", err)
      setError("Something went wrong uploading your documents. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">Documents submitted.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team will review your documents and follow up by email once a
          final decision has been made.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-border bg-card p-8">
      {docTypes.map((docType) => (
        <div key={docType.key} className="grid gap-1.5">
          <Label htmlFor={docType.key}>{docType.label}</Label>
          {existingDocuments?.[docType.key] ? (
            <a
              href={existingDocuments[docType.key].url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary underline"
            >
              Uploaded — view file (re-upload below to replace)
            </a>
          ) : null}
          <input
            id={docType.key}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) =>
              setFiles((f) => ({ ...f, [docType.key]: e.target.files?.[0] ?? null }))
            }
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
          />
        </div>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? "Uploading…" : "Submit documents"}
      </Button>
    </form>
  )
}
