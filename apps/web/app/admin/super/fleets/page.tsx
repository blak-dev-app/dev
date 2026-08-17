"use client"

import * as React from "react"
import Link from "next/link"
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore"
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
  { key: "idx", label: "S. No." },
  { key: "name", label: "Fleet name" },
  { key: "owner", label: "Owner" },
  { key: "vehicles", label: "Vehicles" },
  { key: "source", label: "Source" },
  { key: "joined", label: "Registered on" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
]

const STATUS_OPTIONS = ["Pending Review", "Documents Submitted", "Approved", "Invited", "Rejected"]
const PAGE_SIZE = 10

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetsPage() {
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

  React.useEffect(() => {
    const q = query(collection(db, "fleetApplications"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      },
      () => {
        setError("Could not load fleet applications.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

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
        body: JSON.stringify({ type: "fleet", id }),
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
      const haystack = `${d.fleetName || ""} ${d.businessName || ""} ${d.email || ""}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = pagedDocs.map(({ id, data: d }, i) => {
    const status = d.status || "Pending Review"
    const setStatus = (next: string) =>
      updateDoc(doc(db, "fleetApplications", id), { status: next }).catch(() => {})
    const name = d.fleetName || "—"

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
        <Link href={`/admin/super/fleets/${id}`}>
          <Button size="xs" variant="outline">
            Review
          </Button>
        </Link>
      )
    }

    const actions = (
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/super/fleets/${id}`}>
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
      idx: (page - 1) * PAGE_SIZE + i + 1,
      name,
      owner: d.businessName || "—",
      vehicles: d.vehicles ?? "—",
      source: d.source === "rideblak.com" ? "rideblak.com" : "Website",
      joined: formatDate(d.createdAt),
      status,
      actions,
    }
  })

  const isFiltered = Boolean(statusFilter) || Boolean(searchTerm.trim())

  return (
    <AdminShell
      navItems={superNavItems}
      welcomeName="Admin"
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <PageHeader
        title="FLEETS"
        actions={
          <StatusFilter
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Join Us — Register as a Fleet, and rideblak.com Operator Network submissions
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
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fleet registrations yet. New submissions will appear here automatically.
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fleets match your {isFiltered ? "search/filter" : "search"}.
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
        sourceCollection="fleetApplications"
        sourceId={emailTarget?.id || ""}
      />
      <EditStatusModal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.name || ""}
        collectionName="fleetApplications"
        docId={statusTarget?.id || ""}
        currentStatus={statusTarget?.status}
        options={["Approved", "Pending Review", "Rejected"]}
      />
    </AdminShell>
  )
}
