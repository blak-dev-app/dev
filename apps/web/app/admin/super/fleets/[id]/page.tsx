"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { StatusPill } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const DOC_LABELS: Record<string, string> = {
  businessLicense: "Business license",
  insurance: "Commercial insurance certificate",
  vehicleRegistration: "Vehicle registration(s)",
  taxDocument: "Tax / W-9 document",
}

export default function FleetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [deciding, setDeciding] = React.useState(false)

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, "fleetApplications", id), (snap) => {
      setData(snap.exists() ? snap.data() : null)
      setLoading(false)
    })
    return () => unsub()
  }, [id])

  async function decide(decision: "Active" | "Rejected") {
    setDeciding(true)
    try {
      await fetch("/api/admin/final-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "fleet", id, decision }),
      })
      router.push("/admin/super/fleets")
    } finally {
      setDeciding(false)
    }
  }

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader title="FLEET APPLICATION" />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-destructive">Application not found.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{data.fleetName || "—"}</h3>
              <StatusPill status={data.status || "Pending Review"} />
            </div>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Business name</dt>
              <dd>{data.businessName || "—"}</dd>
              <dt className="text-muted-foreground">Contact</dt>
              <dd>{data.contactName || "—"}</dd>
              <dt className="text-muted-foreground">Contact email</dt>
              <dd>{data.contactEmail || data.email || "—"}</dd>
              <dt className="text-muted-foreground">Contact phone</dt>
              <dd>{data.contactPhone || data.phone || "—"}</dd>
              <dt className="text-muted-foreground">City / Country</dt>
              <dd>{[data.city, data.country].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-muted-foreground">Vehicles</dt>
              <dd>{data.vehicles || "—"}</dd>
              <dt className="text-muted-foreground">Years in operation</dt>
              <dd>{data.yearsInOperation || "—"}</dd>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{data.source || "—"}</dd>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Submitted documents</h3>
            {data.documents && Object.keys(data.documents).length > 0 ? (
              <ul className="grid gap-2 text-sm">
                {Object.entries(data.documents).map(([key, value]: [string, any]) => (
                  <li key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span>{DOC_LABELS[key] || key}</span>
                    <a href={value.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                      View
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            )}

            {data.status === "Documents Submitted" ? (
              <div className="mt-6 flex gap-3">
                <Button disabled={deciding} onClick={() => decide("Active")}>
                  Final Approve
                </Button>
                <Button
                  variant="outline"
                  disabled={deciding}
                  className="border-destructive text-destructive"
                  onClick={() => decide("Rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
