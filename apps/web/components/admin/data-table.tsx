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
  Inactive: "destructive-light",
  Cancelled: "secondary",
  Approved: "success-light",
  Rejected: "destructive-light",
  Pending: "info-light",
  "Pending Review": "info-light",
  Invited: "primary-light",
  "Documents Submitted": "warning-light",
  "Driver Assigned": "success-light",
  Breakdown: "warning-light",
  Available: "primary-light",
  Ongoing: "warning-light",
  Accepted: "success-light",
  Failed: "destructive-light",
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

/**
 * Real, controlled pagination. Pass `page`/`pageCount`/`onPageChange` from the
 * parent page's own paging state (see e.g. app/admin/super/drivers/page.tsx).
 * Bare `<Pagination />` (no props) renders nothing rather than fake page numbers,
 * for pages that haven't been wired up to real paging yet.
 */
export function Pagination({
  page = 1,
  pageCount = 1,
  onPageChange,
}: {
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
}) {
  if (pageCount <= 1) return null

  const pages: (number | "ellipsis")[] = []
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis")
    }
  }

  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-xs font-medium text-muted-foreground">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        className="cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹ Previous
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`}>. . .</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange?.(p)}
            className={
              p === page
                ? "inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
                : "cursor-pointer hover:text-foreground"
            }
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        className="cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next ›
      </button>
    </div>
  )
}
