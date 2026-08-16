"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Search } from "lucide-react"
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { cn } from "@blak/ui/lib/utils"
import type { AdminNavItem } from "@/lib/admin/nav"

type AdminShellProps = {
  navItems: AdminNavItem[]
  welcomeName?: string
  children: React.ReactNode
  /**
   * Controlled search box value/handler. Pages that want the header search
   * box to actually filter their own list pass both of these down (see
   * e.g. app/admin/super/drivers/page.tsx). If omitted, the search box
   * still works (keeps its own local state) but nothing consumes it yet.
   */
  searchValue?: string
  onSearchChange?: (value: string) => void
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

function formatRelative(ts: any) {
  if (!ts) return ""
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

type Notification = {
  id: string
  title: string
  subtitle: string
  createdAt: any
  source: string
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

function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Notification[]>([])
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  React.useEffect(() => {
    const sources: { col: string; label: (d: any) => string; kind: string }[] = [
      { col: "fleetApplications", label: (d) => `New fleet application — ${d.companyName || d.name || "Unnamed"}`, kind: "Fleet" },
      { col: "driverApplications", label: (d) => `New driver application — ${d.name || "Unnamed"}`, kind: "Driver" },
      { col: "queries", label: (d) => `New query — ${d.subject || d.message || "Untitled"}`, kind: "Query" },
    ]
    const unsubs = sources.map(({ col, label, kind }) =>
      onSnapshot(query(collection(db, col), orderBy("createdAt", "desc"), limit(5)), (snap) => {
        const next = snap.docs.map((doc) => ({
          id: `${col}-${doc.id}`,
          title: label(doc.data()),
          subtitle: kind,
          createdAt: doc.data().createdAt,
          source: col,
        }))
        setItems((prev) => {
          const withoutSource = prev.filter((p) => p.source !== col)
          return [...withoutSource, ...next]
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
            .slice(0, 8)
        })
      })
    )
    return () => unsubs.forEach((u) => u())
  }, [])

  const count = items.length

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b border-border px-4 py-3 last:border-0 hover:bg-muted/40">
                  <p className="text-xs font-medium">{n.title}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{n.subtitle}</span>
                    <span className="text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ welcomeName }: { welcomeName?: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  async function handleLogout() {
    setOpen(false)
    await signOut(auth)
    router.push("/")
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        aria-label="Account menu"
      >
        {initials(welcomeName)}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{welcomeName || "Admin"}</p>
            <p className="text-xs text-muted-foreground">BLAK Admin Console</p>
          </div>
          <nav className="flex flex-col p-1.5">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Back to site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

export function AdminShell({
  navItems,
  welcomeName,
  children,
  searchValue,
  onSearchChange,
}: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [authChecked, setAuthChecked] = React.useState(false)
  const [localSearch, setLocalSearch] = React.useState("")

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthChecked(true)
      } else {
        const loginHref = pathname?.startsWith("/admin/fleet")
          ? "/admin/fleet/login"
          : "/admin/super/login"
        router.replace(loginHref)
      }
    })
    return () => unsub()
  }, [pathname, router])

  // If the page didn't opt into a controlled search box, fall back to local
  // state (still a real, working input — just not wired to filter anything
  // on pages that haven't adopted the pattern yet). Reset on navigation.
  React.useEffect(() => {
    setLocalSearch("")
  }, [pathname])

  const effectiveSearchValue = searchValue ?? localSearch
  const effectiveOnSearchChange = onSearchChange ?? setLocalSearch

  if (!authChecked) {
    return null
  }

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
              value={effectiveSearchValue}
              onChange={(e) => effectiveOnSearchChange(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ProfileMenu welcomeName={welcomeName} />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
