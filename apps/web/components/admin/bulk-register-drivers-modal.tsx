"use client"

import * as React from "react"
import { auth } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { BULK_COLUMNS, MAX_BULK_ROWS, TEMPLATE_EXAMPLE_ROW, parseDelimitedText } from "@/lib/bulk-drivers"

type Outcome = "create" | "skip" | "reject"

interface WireVerdict {
  rowNumber: number
  outcome: Outcome
  email: string
  fullName: string
  reason?: string
}

interface BulkResponse {
  mode: "dry-run" | "commit"
  fleetId: string
  fleetName: string
  summary: { create: number; skip: number; reject: number; total: number }
  verdicts: WireVerdict[]
  created?: number
  batchId?: string | null
}

/**
 * Fleet Admin: register a roster of drivers in one go (task #217).
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS A PREVIEW STEP AND NOT JUST AN UPLOAD BUTTON
 * ---------------------------------------------------------------------------
 * Partial failure is the defining problem of every bulk import. Row 47 of 200
 * is malformed — do you reject the whole file and make the operator hunt for
 * it, or import 199 and hope they read the summary? Both are bad, and both
 * make the operator guess what state their data is in.
 *
 * So nothing is written until the operator has seen, row by row, exactly what
 * will happen. The server validates the whole file first and returns a verdict
 * per row; this component renders it; only then is there something to confirm.
 * By the time anyone clicks the button, there is no ambiguity left to resolve.
 *
 * The preview is a preview and nothing more — the confirm step sends the same
 * raw rows back and the server re-validates all of them from scratch. This
 * component's opinion about a row is never load-bearing.
 */
export function BulkRegisterDriversModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = React.useState<string[][] | null>(null)
  const [sourceLabel, setSourceLabel] = React.useState("")
  const [pasted, setPasted] = React.useState("")
  const [preview, setPreview] = React.useState<BulkResponse | null>(null)
  const [done, setDone] = React.useState<BulkResponse | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) return
    // Reset on close so a second upload never inherits the first one's state.
    setRows(null)
    setSourceLabel("")
    setPasted("")
    setPreview(null)
    setDone(null)
    setBusy(false)
    setError("")
  }, [open])

  if (!open) return null

  /**
   * Build the CSV template in the browser rather than serving a committed file.
   *
   * Two reasons, and the second is the important one:
   *
   *  - No binary asset to keep in the repo.
   *  - It is generated from BULK_COLUMNS, the same constant the server
   *    validates against, so the template and the validator physically cannot
   *    disagree. A committed template is a copy, and copies drift — someone
   *    adds a required field, the validator starts rejecting every upload, and
   *    the file everyone downloaded still shows the old columns.
   *
   * The Excel version (dropdowns, and phone/licence pre-formatted as Text) is
   * a static download offered alongside this. This one is the fallback that
   * always works.
   */
  function downloadCsvTemplate() {
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const header = BULK_COLUMNS.map((c) => escape(c.header + (c.required ? " *" : "")))
    const example = BULK_COLUMNS.map((c) => escape(String(TEMPLATE_EXAMPLE_ROW[c.key] ?? "")))
    const csv = [header.join(","), example.join(",")].join("\r\n") + "\r\n"

    // BOM so Excel opens it as UTF-8 rather than mangling accented names.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "blak-driver-bulk-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function call(mode: "dry-run" | "commit", payload: string[][]) {
    const user = auth.currentUser
    if (!user) throw new Error("You appear to be signed out. Sign in again and retry.")
    const token = await user.getIdToken()
    const res = await fetch("/api/fleet/drivers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, rows: payload }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
    return json as BulkResponse
  }

  async function loadGrid(grid: string[][], label: string) {
    setError("")
    setDone(null)
    if (grid.length < 2) {
      setError("That file has a header row but no drivers in it.")
      return
    }
    setRows(grid)
    setSourceLabel(label)
    setBusy(true)
    try {
      setPreview(await call("dry-run", grid))
    } catch (err) {
      // Shown, never swallowed — the same rule the rest of this console follows.
      setPreview(null)
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > 2_000_000) {
      setError("That file is unusually large for a driver roster. Please check it and try again.")
      return
    }
    const text = await file.text()
    await loadGrid(parseDelimitedText(text), file.name)
  }

  async function handleConfirm() {
    if (!rows) return
    setBusy(true)
    setError("")
    try {
      const result = await call("commit", rows)
      setDone(result)
      setPreview(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const badge = (outcome: Outcome) =>
    outcome === "create"
      ? "bg-emerald-50 text-emerald-700"
      : outcome === "skip"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700"

  const label = (outcome: Outcome) =>
    outcome === "create" ? "Will register" : outcome === "skip" ? "Skipped" : "Rejected"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card p-6"
      >
        <h3 className="text-sm font-semibold">Bulk register drivers</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Drivers you add here are submitted to BLAK for review and start as{" "}
          <strong>Pending Review</strong>. They can&apos;t take rides until approved.
        </p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {/* ---------------------------------------------------------- done */}
          {done ? (
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {done.created} driver{done.created === 1 ? "" : "s"} registered to {done.fleetName}.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {done.summary.skip} skipped, {done.summary.reject} rejected. They now appear in your
                Drivers list as Pending Review while BLAK reviews them.
              </p>
              <VerdictTable verdicts={done.verdicts} badge={badge} label={label} />
            </div>
          ) : preview ? (
            /* ------------------------------------------------------ preview */
            <div>
              <p className="text-sm">
                <strong>{preview.summary.create}</strong> of {preview.summary.total} rows will be
                registered to <strong>{preview.fleetName}</strong>.
                {preview.summary.skip > 0 ? ` ${preview.summary.skip} already exist and will be skipped.` : ""}
                {preview.summary.reject > 0 ? ` ${preview.summary.reject} have problems and won't be imported.` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Read from {sourceLabel}. Nothing has been saved yet.
              </p>
              <VerdictTable verdicts={preview.verdicts} badge={badge} label={label} />
            </div>
          ) : (
            /* -------------------------------------------------------- input */
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold">1. Start from the template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  It has the right columns, a dropdown of valid vehicle types, and the phone and
                  licence columns pre-formatted as text so Excel doesn&apos;t strip leading zeros.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="/blak-driver-bulk-template.xlsx"
                    download
                    className="text-xs font-semibold underline"
                  >
                    Download the Excel template
                  </a>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="text-xs text-muted-foreground underline"
                  >
                    or a plain CSV version
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Delete the example row before uploading — it&apos;s only there to show the format,
                  and the importer will reject it.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold">2a. Upload the filled-in file</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                  className="mt-2 block w-full text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Save as CSV from Excel (File → Save As → CSV), or paste below instead.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold">2b. Or paste straight from the spreadsheet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select your rows in Excel including the header, copy, and paste here. Often
                  quicker than saving a file.
                </p>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={5}
                  placeholder="Full name&#9;Email&#9;Phone&#9;City&#9;…"
                  className="mt-2 w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs"
                />
                <Button
                  size="xs"
                  variant="outline"
                  disabled={!pasted.trim() || busy}
                  onClick={() => void loadGrid(parseDelimitedText(pasted), "pasted data")}
                >
                  Check pasted rows
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Up to {MAX_BULK_ROWS} drivers per upload. Re-uploading a corrected file is safe —
                anyone already registered is skipped rather than duplicated.
              </p>
            </div>
          )}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="mt-5 flex shrink-0 justify-end gap-3 border-t border-border pt-4">
          {preview ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setPreview(null)} disabled={busy}>
                Back
              </Button>
              <Button size="sm" onClick={() => void handleConfirm()} disabled={busy || preview.summary.create === 0}>
                {busy
                  ? "Registering…"
                  : preview.summary.create === 0
                    ? "Nothing to register"
                    : `Register ${preview.summary.create} driver${preview.summary.create === 1 ? "" : "s"}`}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>
              {done ? "Close" : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function VerdictTable({
  verdicts,
  badge,
  label,
}: {
  verdicts: WireVerdict[]
  badge: (o: Outcome) => string
  label: (o: Outcome) => string
}) {
  // Problems first. On a 200-row upload the handful of rows needing attention
  // are what the operator actually has to act on, and making them scroll to
  // find them buried among the successes defeats the point of the preview.
  const order: Record<Outcome, number> = { reject: 0, skip: 1, create: 2 }
  const sorted = [...verdicts].sort(
    (a, b) => order[a.outcome] - order[b.outcome] || a.rowNumber - b.rowNumber
  )

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 font-semibold">Row</th>
            <th className="px-3 py-2 font-semibold">Driver</th>
            <th className="px-3 py-2 font-semibold">Email</th>
            <th className="px-3 py-2 font-semibold">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => (
            <tr key={v.rowNumber} className="border-t border-border">
              <td className="px-3 py-2 text-muted-foreground">{v.rowNumber}</td>
              <td className="px-3 py-2">{v.fullName || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{v.email || "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-0.5 font-semibold ${badge(v.outcome)}`}>
                  {label(v.outcome)}
                </span>
                {v.reason ? <span className="ml-2 text-muted-foreground">{v.reason}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
