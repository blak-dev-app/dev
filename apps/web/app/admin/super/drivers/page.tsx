"use client"

import * as React from "react"
import Link from "next/link"
import { collection, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { StatusFilter } from "@/components/admin/status-filter"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { SendEmailModal } from "@/components/admin/send-email-modal"
import { EditStatusModal } from "@/components/admin/edit-status-modal"

const columns: Column[] = [
  { key: "select", label: "" },
  { key: "idx", label: "S. No." },
  { key: "name", label: "Driver name" },
  { key: "phone", label: "Mobile" },
  { key: "vehicle", label: "Vehicle" },
  { key: "fleet", label: "Fleet" },
  { key: "joined", label: "Registered on" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

const STATUS_OPTIONS = ["Pending Review", "Documents Submitted", "Approved", "Invited", "Rejected"]
const PAGE_SIZE = 10

/** Firestore batched writes cap at 500 operations. */
const WRITE_BATCH_LIMIT = 500

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function SuperDriversPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [invitingId, setInvitingId] = React.useState<string | null>(null)
  const [inviteLink, setInviteLink] = React.useState<string | null>(null)
  const [emailTarget, setEmailTarget] = React.useState<{ id: string; name: string; email?: string } | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<{ id: string; name: string; status: string } | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  // Selection for bulk approve/reject (task #222). Held as a Set of document
  // ids rather than an index list, so it survives re-sorting, re-filtering and
  // the live onSnapshot pushing new rows in underneath the operator.
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = React.useState(false)
  const [bulkResult, setBulkResult] = React.useState("")

  React.useEffect(() => {
    const q = query(collection(db, "driverApplications"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      },
      () => {
        setError("Could not load driver applications.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // Reset to page 1 whenever the active search term or status filter changes,
  // so the admin doesn't get stranded on an out-of-range page.
  React.useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  async function sendInvite(id: string) {
    setInvitingId(id)
    setInviteLink(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: "driver", id }),
      })
      const json = await res.json()
      if (res.ok) setInviteLink(json.inviteLink)
    } finally {
      setInvitingId(null)
    }
  }

  const filteredDocs = docs.filter(({ data: d }) => {
    const status = d.status || "Pending Review"
    if (statusFilter && status !== statusFilter) return false
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const haystack = `${d.fullName || d.username || ""} ${d.phone || ""} ${d.email || ""} ${d.fleetName || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /**
   * Only Pending Review records can be bulk-actioned.
   *
   * Deliberately narrow. Approve and Reject are the two decisions that pile up
   * — a fleet bulk-registering 200 drivers (#217) creates 200 of them at once,
   * and clearing that one row at a time is the bottleneck this exists to fix.
   * Every other transition is a judgement about a specific driver, and batching
   * those would make it too easy to sweep a record into a state nobody looked
   * at. Rows in other statuses simply have no checkbox.
   */
  const selectableOnPage = pagedDocs.filter(({ data: d }) => (d.status || "Pending Review") === "Pending Review")
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(({ id }) => selected.has(id))

  function toggleOne(id: string) {
    setBulkResult("")
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllOnPage() {
    setBulkResult("")
    setSelected((prev) => {
      const next = new Set(prev)
      // Scoped to the current page on purpose: "select all" silently spanning
      // pages the operator has never seen is how people approve records they
      // did not read. The count in the action bar always matches what was
      // actually ticked.
      if (allOnPageSelected) selectableOnPage.forEach(({ id }) => next.delete(id))
      else selectableOnPage.forEach(({ id }) => next.add(id))
      return next
    })
  }

  /**
   * Apply one status to every selected application.
   *
   * Runs client-side through Firestore batched writes rather than a new API
   * route, because super_admin already holds an unconditional update on
   * driverApplications in firestore.rules — the same permission the existing
   * per-row Approve button uses. Adding a server route would not add a single
   * check that the rules do not already enforce.
   *
   * Chunked at 500 because that is Firestore's hard cap per batch. Chunks are
   * committed in sequence, so a failure part-way through leaves earlier chunks
   * applied; the count reported back is what actually succeeded, and the list
   * is live, so the operator sees the true state either way.
   */
  async function applyBulkStatus(next: "Approved" | "Rejected") {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkBusy(true)
    setBulkResult("")
    let done = 0
    try {
      for (let i = 0; i < ids.length; i += WRITE_BATCH_LIMIT) {
        const batch = writeBatch(db)
        const slice = ids.slice(i, i + WRITE_BATCH_LIMIT)
        slice.forEach((id) => batch.update(doc(db, "driverApplications", id), { status: next }))
        await batch.commit()
        done += slice.length
      }
      setSelected(new Set())
      setBulkResult(
        `${done} driver${done === 1 ? "" : "s"} ${next === "Approved" ? "approved" : "rejected"}.` +
          (next === "Approved" ? " Send their invites from the Actions column." : "")
      )
    } catch (err) {
      // Surfaced with the real count, not swallowed. If chunk 1 committed and
      // chunk 2 failed, saying "failed" would be a lie about 500 records.
      const message = (err as { message?: string } | null)?.message
      setBulkResult(
        done > 0
          ? `Applied to ${done} of ${ids.length}, then stopped: ${message || "write failed"}`
          : `Couldn't apply that change: ${message || "write failed"}`
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const rows = pagedDocs.map(({ id, data: d }, i) => {
    const status = d.status || "Pending Review"
    const setStatus = (next: string) =>
      updateDoc(doc(db, "driverApplications", id), { status: next }).catch(() => {})
    const name = d.fullName || d.username || "—"

    let primaryAction: React.ReactNode = "—"
    if (status === "Pending Review") {
      primaryAction = (
        <div className="flex gap-2">
          <Button size="xs" variant="outline" onClick={() => setStatus("Approved")}>
            Approve
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="border-destructive text-destructive"
            onClick={() => setStatus("Rejected")}
          >
            Reject
          </Button>
        </div>
      )
    } else if (status === "Approved" || status === "Invited") {
      primaryAction = (
        <Button size="xs" variant="outline" disabled={invitingId === id} onClick={() => sendInvite(id)}>
          {invitingId === id ? "Sending…" : status === "Invited" ? "Resend Invite" : "Send Invite"}
        </Button>
      )
    } else if (status === "Documents Submitted") {
      primaryAction = (
        <Link href={`/admin/super/drivers/${id}`}>
          <Button size="xs" variant="outline">
            Review
          </Button>
        </Link>
      )
    }

    const actions = (
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/super/drivers/${id}`}>
          <Button size="xs" variant="outline">
            View
          </Button>
        </Link>
        {primaryAction}
        <Button
          size="xs"
          variant="outline"
          onClick={() => setEmailTarget({ id, name, email: d.email })}
        >
          Email
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setStatusTarget({ id, name, status })}
        >
          Edit status
        </Button>
      </div>
    )

    return {
      select:
        status === "Pending Review" ? (
          <input
            type="checkbox"
            aria-label={`Select ${name}`}
            checked={selected.has(id)}
            onChange={() => toggleOne(id)}
            className="size-4 cursor-pointer accent-primary"
          />
        ) : null,
      idx: (page - 1) * PAGE_SIZE + i + 1,
      name,
      phone: d.phone || "—",
      vehicle: d.vehicleType || "—",
      fleet: d.fleetName || "—",
      joined: formatDate(d.createdAt),
      status,
      actions,
    }
  })

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())
  const selectedCount = selected.size

  return (
    <AdminShell
      navItems={superNavItems}
      welcomeName="Admin"
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <PageHeader
        title="DRIVERS"
        actions={
          <StatusFilter
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />
      {/* Wording changed 2026-08-24 (task #217). "Live from Join Us" was true
          when the website form was the only way a driver record could exist.
          Fleets can now bulk-register their own rosters, and those records
          carry source: "Fleet bulk upload" — so a reviewer needs to know this
          list has more than one origin. */}
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — Join Us signups and rosters bulk-registered by fleet operators.
      </p>
      {inviteLink ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <span className="font-semibold text-muted-foreground">Invite link:</span>
          <a href={inviteLink} target="_blank" rel="noreferrer" className="break-all text-primary underline">
            {inviteLink}
          </a>
          <Button size="xs" variant="outline" onClick={() => navigator.clipboard.writeText(inviteLink)}>
            Copy
          </Button>
          <Button size="xs" variant="outline" onClick={() => setInviteLink(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {selectedCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
          <span className="font-semibold">
            {selectedCount} driver{selectedCount === 1 ? "" : "s"} selected
          </span>
          <Button size="xs" disabled={bulkBusy} onClick={() => void applyBulkStatus("Approved")}>
            {bulkBusy ? "Working…" : `Approve ${selectedCount}`}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="border-destructive text-destructive"
            disabled={bulkBusy}
            onClick={() => void applyBulkStatus("Rejected")}
          >
            Reject {selectedCount}
          </Button>
          <Button size="xs" variant="outline" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <span className="text-muted-foreground">
            Approving does not send invites — do that from the Actions column.
          </span>
        </div>
      ) : null}
      {bulkResult ? (
        <p className="mb-4 text-xs font-semibold text-muted-foreground">{bulkResult}</p>
      ) : null}
      {!loading && !error && selectableOnPage.length > 0 ? (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleAllOnPage}
            className="size-4 cursor-pointer accent-primary"
          />
          Select all {selectableOnPage.length} pending on this page
        </label>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No driver applications yet. New Join Us submissions will appear here automatically.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No drivers match your {isFiltered ? "search/filter" : "search"}.
        </p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}

      <SendEmailModal
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        recipientName={emailTarget?.name || ""}
        recipientEmail={emailTarget?.email}
        sourceCollection="driverApplications"
        sourceId={emailTarget?.id || ""}
      />
      <EditStatusModal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.name || ""}
        collectionName="driverApplications"
        docId={statusTarget?.id || ""}
        currentStatus={statusTarget?.status}
        options={["Approved", "Pending Review", "Rejected"]}
      />
    </AdminShell>
  )
}
