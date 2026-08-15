"use client"

import * as React from "react"
import { Badge, type BadgeProps } from "@blak/ui/components/badge"

export type Column = {
  key: string
  label: string
}

type StatusVariant = NonNullable<BadgeProps["variant"]>

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  "In Progress": "primary-light",
  "On hold": "warning-light",
  Open: "info-light",
  Closed: "secondary",
  New: "info-light",
  Completed: "success-light",
  Active: "success-light",
  Cancelled: "secondary",
  Approved: "success-light",
  Rejected: "destructive-light",
  Pending: "info-light",
  "Pending Review": "info-light",
  "Driver Assigned": "success-light",
  Breakdown: "warning-light",
  Available: "primary-light",
}

export function StatusPill({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? "secondary"
  return (
    <Badge variant={variant} size="lg" radius="full">
      {status}
    </Badge>
  )
}

export function DataTable({
  columns,
  rows,
}: {
  columns: Column[]
  rows: Record<string, React.ReactNode>[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border last:border-0 hover:bg-muted/40"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3.5 align-middle">
                  {c.key === "status" ? (
                    <StatusPill status={String(row[c.key] ?? "")} />
                  ) : (
                    row[c.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination() {
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-xs font-medium text-muted-foreground">
      <span className="cursor-pointer hover:text-foreground">‹ Previous</span>
      <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        1
      </span>
      <span className="cursor-pointer hover:text-foreground">2</span>
      <span className="cursor-pointer hover:text-foreground">3</span>
      <span className="cursor-pointer hover:text-foreground">4</span>
      <span>. . . . . .</span>
      <span className="cursor-pointer hover:text-foreground">10</span>
      <span className="cursor-pointer hover:text-foreground">Next ›</span>
    </div>
  )
}
