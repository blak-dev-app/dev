"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { cn } from "@blak/ui/lib/utils"
import type { AdminNavItem } from "@/lib/admin/nav"

type AdminShellProps = {
  navItems: AdminNavItem[]
  welcomeName?: string
  children: React.ReactNode
}

function initials(name?: string) {
  if (!name) return "AD"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function AdminShell({ navItems, welcomeName, children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 block px-2">
          <Image src="/logo/logo.png" width={120} height={32} alt="BLAK" />
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.subItems
              ? pathname.startsWith(item.href)
              : pathname === item.href
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
                {item.subItems && (
                  <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-border pl-3">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        className={cn(
                          "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          pathname === sub.href
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-input/30 px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="relative inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                3
              </span>
            </span>
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(welcomeName)}
            </span>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
