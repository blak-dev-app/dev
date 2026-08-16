"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminShell } from "@/components/admin/admin-shell"
import { superNavItems } from "@/lib/admin/nav"
import { Button } from "@blak/ui/components/button"
import { ArrowLeft, Send } from "lucide-react"

function formatDateTime(ts: any) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [messages, setMessages] = React.useState<{ id: string; data: any }[]>([])
  const [reply, setReply] = React.useState("")
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    if (!params?.id) return
    const unsub = onSnapshot(
      doc(db, "driverTickets", params.id),
      (snap) => {
        setData(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [params?.id])

  React.useEffect(() => {
    if (!params?.id) return
    const q = query(collection(db, "driverTickets", params.id, "messages"), orderBy("createdAt", "asc"))
    const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, data: d.data() }))), () =>
      setMessages([])
    )
    return () => unsub()
  }, [params?.id])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !params?.id) return
    setSending(true)
    try {
      await addDoc(collection(db, "driverTickets", params.id, "messages"), {
        sender: "admin",
        message: reply,
        createdAt: serverTimestamp(),
      })
      setReply("")
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminShell navItems={superNavItems} welcomeName="Admin">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-1 size-4" />
        Query Details
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Ticket not found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold">{data.subject || "—"}</span>
                <span className="ml-3 text-xs text-muted-foreground">
                  Ticket ID: {params.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {data.status || "New"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Registered on: {formatDateTime(data.createdAt)}</div>
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold">Subject</h4>
              <p className="text-sm text-muted-foreground">{data.subject || "—"}</p>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">Query</h4>
              <p className="text-sm text-muted-foreground">{data.description || data.message || "—"}</p>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Conversations</h3>
            <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: 360 }}>
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No messages yet. Reply below to start the conversation.</p>
              ) : (
                messages.map(({ id, data: m }) => (
                  <div key={id} className="rounded-lg bg-muted/40 p-2 text-xs">
                    <div className="font-medium">{m.sender === "admin" ? "Admin" : "User"}</div>
                    <div className="mt-1 text-muted-foreground">{m.message}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-input/30 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
                placeholder="Write here"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={sending || !reply.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
