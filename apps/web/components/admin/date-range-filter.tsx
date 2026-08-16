"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

export type DateRangeValue = "today" | "7d" | "30d" | "all"

const LABELS: Record<DateRangeValue, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
}

/**
 * Given a DateRangeValue, returns the inclusive lower bound to filter a
 * collection's `createdAt` timestamp against. `null` means no lower bound
 * (i.e. "All time").
 */
export function dateRangeToStart(value: DateRangeValue): Date | null {
  if (value === "all") return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (value === "7d") start.setDate(start.getDate() - 6)
  if (value === "30d") start.setDate(start.getDate() - 29)
  return start
}

export function isWithinDateRange(ts: any, value: DateRangeValue): boolean {
  const start = dateRangeToStart(value)
  if (!start) return true
  if (!ts) return false
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.getTime() >= start.getTime()
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [ref, onOutside])
}

/**
 * Real date-range dropdown (Today / Last 7 days / Last 30 days / All time)
 * that actually changes which records feed the stats it's attached to,
 * replacing previously-static "Today ▾" / "Month ▾" labels on the dashboards.
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {LABELS[value]} <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-border bg-card p-1 shadow-lg">
          {(Object.keys(LABELS) as DateRangeValue[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key)
                setOpen(false)
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                value === key ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
