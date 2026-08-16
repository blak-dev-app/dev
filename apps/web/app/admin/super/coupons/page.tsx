"use client"

import * as React from "react"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable, Pagination, type Column } from "@/components/admin/data-table"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"

const columns: Column[] = [
  { key: "code", label: "Coupon Code" },
  { key: "type", label: "Coupon Type" },
  { key: "value", label: "Percentage/Amount" },
  { key: "validFrom", label: "Valid From" },
  { key: "validTo", label: "Valid To" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
]

const inputClass =
  "w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"

type CouponForm = {
  code: string
  type: string
  value: string
  validFrom: string
  validTo: string
  status: string
}

const emptyForm: CouponForm = {
  code: "",
  type: "Flat Percentage",
  value: "",
  validFrom: "",
  validTo: "",
  status: "Active",
}

function formatDateTime(v: any) {
  if (!v) return "—"
  const d = v.toDate ? v.toDate() : new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function CouponsPage() {
  const [docs, setDocs] = React.useState<{ id: string; data: any }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<CouponForm>(emptyForm)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "coupons"), orderBy("createdAt", "desc")),
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(id: string, d: any) {
    setEditingId(id)
    setForm({
      code: d.code || "",
      type: d.type || "Flat Percentage",
      value: d.value || "",
      validFrom: d.validFrom || "",
      validTo: d.validTo || "",
      status: d.status || "Active",
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await updateDoc(doc(db, "coupons", editingId), { ...form })
      } else {
        await addDoc(collection(db, "coupons"), { ...form, createdAt: serverTimestamp() })
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const rows = docs.map(({ id, data: d }) => ({
    code: d.code || "—",
    type: d.type || "—",
    value: d.value || "—",
    validFrom: formatDateTime(d.validFrom),
    validTo: formatDateTime(d.validTo),
    status: d.status || "Active",
    action: (
      <Button variant="outline" size="sm" onClick={() => openEdit(id, d)}>
        Edit
      </Button>
    ),
  }))

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <PageHeader
        title="COUPONS"
        actions={
          <Button size="sm" onClick={openAdd}>
            Add Coupon +
          </Button>
        }
      />
      <p className="mb-4 text-xs font-semibold text-muted-foreground">
        Live from Firestore — coupons created here apply platform-wide.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No coupons yet. Create one to get started.</p>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <Pagination />
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6"
          >
            <h3 className="mb-4 text-sm font-semibold">
              {editingId ? "Edit Coupon" : "Add Coupon"}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                required
                placeholder="Coupon Code"
                className={inputClass}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option>Flat Percentage</option>
                <option>Flat Amount</option>
                <option>Conditional Discount</option>
              </select>
              <input
                required
                placeholder="Percentage / Amount (e.g. 20% or $50)"
                className={inputClass}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Valid From</label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Valid To</label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={form.validTo}
                    onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                  />
                </div>
              </div>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : "Submit"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  )
}
