"use client"
import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { EditDetailsModal, humanizeDocKey } from "@/components/admin/edit-details-modal"
import { ArrowLeft, Check } from "lucide-react"

/** Fields Super Admin may correct on a fleet record. */
const FLEET_EDITABLE_FIELDS = [
  { key: "fleetName", label: "Fleet name" },
  { key: "businessName", label: "Business name" },
  { key: "email", label: "Email ID", type: "email" as const },
  { key: "phone", label: "Phone number", type: "tel" as const },
  { key: "address", label: "Full address" },
]

function formatDate(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FleetDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [drivers, setDrivers] = React.useState<{ id: string; data: any }[]>([])
  const [transactions, setTransactions] = React.useState<{ id: string; data: any }[]>([])
  const [editing, setEditing] = React.useState(false)
  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "fleetApplications", params.id),
      (snap) => {
        setData(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [params?.id])
  React.useEffect(() => {
    if (!data?.fleetName) return
    const q = query(collection(db, "driverApplications"), where("fleetName", "==", data.fleetName))
    const unsub = onSnapshot(q, (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, data: d.data() }))), () =>
      setDrivers([])
    )
    return () => unsub()
  }, [data?.fleetName])
  React.useEffect(() => {
    if (!params?.id) return
    const q = query(collection(db, "transactions"), where("fleetId", "==", params.id), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => setTransactions(snap.docs.slice(0, 5).map((d) => ({ id: d.id, data: d.data() }))), () =>
      setTransactions([])
    )
    return () => unsub()
  }, [params?.id])

  // FIXED 2026-08-18: this counted `status === "Approved"` as active. The active
  // status in this system is "Active" — "Approved" is the earlier step, before
  // the driver has been invited and onboarded. The effect was that a fleet whose
  // drivers were genuinely Active reported 0 active and all of them inactive:
  // exactly backwards, on the page used to judge the fleet.
  const activeDrivers = drivers.filter((d) => (d.data.status || "") === "Active").length
  const inactiveDrivers = drivers.length - activeDrivers

  // Documents ACTUALLY on the record. See humanizeDocKey() for why this is
  // derived rather than a fixed list.
  const uploadedDocs: string[] = React.useMemo(() => {
    const docs = data?.documents
    if (!docs || typeof docs !== "object") return []
    return Object.keys(docs).filter((key) => docs[key] && docs[key].url)
  }, [data?.documents])

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-1 size-4" />
        Fleet Details
      </Button>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Fleet not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">{data.fleetName || "—"}</div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {data.status || "Pending Review"}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="inline font-semibold">Business name: </dt>
                <dd className="inline text-muted-foreground">{data.businessName || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Email ID: </dt>
                <dd className="inline text-muted-foreground">{data.email || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Phone number: </dt>
                <dd className="inline text-muted-foreground">{data.phone || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Full address: </dt>
                <dd className="inline text-muted-foreground">{data.address || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Passport number or ID: </dt>
                <dd className="inline text-muted-foreground">{data.passportId || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Social security number: </dt>
                <dd className="inline text-muted-foreground">{data.ssn || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Insurance number: </dt>
                <dd className="inline text-muted-foreground">{data.insuranceNumber || "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">No. of Vehicles: </dt>
                <dd className="inline text-muted-foreground">{data.vehicles ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">No. of Drivers: </dt>
                <dd className="inline text-muted-foreground">{drivers.length || data.driversCount || "—"}</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setEditing(true)}
            >
              Edit details
            </Button>
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold">Document list</h4>
              {uploadedDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents uploaded yet.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {uploadedDocs.map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <Check className="size-4 text-emerald-500" />
                      {humanizeDocKey(key)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Drivers</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{drivers.length}</div>
                <div className="text-xs text-muted-foreground">Total Drivers</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{activeDrivers}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{inactiveDrivers}</div>
                <div className="text-xs text-muted-foreground">Inactive</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Payments</h3>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalRevenue ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalPayout ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Payout</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-lg font-semibold">{data.totalDeduction ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Total Deduction</div>
              </div>
            </div>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Last few transactions</h4>
            {transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {transactions.map(({ id, data: t }) => (
                  <li key={id} className="flex items-center justify-between border-t border-border pt-2">
                    <span>{t.name || t.paidBy || "—"}</span>
                    <span className="text-muted-foreground">{formatDate(t.createdAt)}</span>
                    <span className="font-semibold">{t.amount ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {data && params?.id ? (
        <EditDetailsModal
          open={editing}
          onClose={() => setEditing(false)}
          title={data.fleetName || "Fleet"}
          collectionName="fleetApplications"
          docId={params.id}
          fields={FLEET_EDITABLE_FIELDS}
          current={data}
        />
      ) : null}
    </AdminShell>
  )
}
