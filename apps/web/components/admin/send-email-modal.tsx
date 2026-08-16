"use client"

import * as React from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"

const inputClass =
  "w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"

type SendEmailModalProps = {
  open: boolean
  onClose: () => void
  recipientName: string
  recipientEmail?: string
  sourceCollection: string
  sourceId: string
}

export function SendEmailModal({
  open,
  onClose,
  recipientName,
  recipientEmail,
  sourceCollection,
  sourceId,
}: SendEmailModalProps) {
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSubject("")
      setMessage("")
      setSent(false)
    }
  }, [open])

  if (!open) return null

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      await addDoc(collection(db, "adminEmails"), {
        recipientName,
        recipientEmail: recipientEmail || null,
        sourceCollection,
        sourceId,
        subject,
        message,
        createdAt: serverTimestamp(),
      })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSend}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6"
      >
        <h3 className="mb-1 text-sm font-semibold">Send Email</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          To: {recipientName}
          {recipientEmail ? ` <${recipientEmail}>` : ""}
        </p>
        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Email queued for {recipientName}.</p>
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <input
                required
                placeholder="Subject line"
                className={inputClass}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                required
                placeholder="Message"
                rows={5}
                className={inputClass}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={sending}>
                {sending ? "Sending…" : "Send email"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
