"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@blak/ui/components/button"

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
 * Real status-filter dropdown used across admin list pages, replacing the
 * previous decorative "Filter by Status ▾" button that had no onClick.
 */
export function StatusFilter({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        {value ? `Status: ${value}` : "Filter by Status"}
        <ChevronDown className="ml-1 size-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
              !value ? "font-semibold text-primary" : "text-foreground"
            }`}
          >
            All statuses
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                value === opt ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
