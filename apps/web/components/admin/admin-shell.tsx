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
  where,
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
type NotificationSource = {
  col: string
  label: (d: any) => string
  kind: string
  /** [field, value] equality filter. Omitted means "read the collection unscoped". */
  scope?: [string, string]
}
/**
 * Which collections this role may be notified about, and how they are scoped.
 *
 * REWRITTEN 2026-08-18 (task #209). This used to be a fixed list of three
 * collections read with `orderBy("createdAt") limit(5)` and **no `where`
 * clause at all**, identically for every role. Three separate problems:
 *
 *  1. CROSS-TENANT LEAK. The `queries` collection was readable by any signed-in
 *     account under the old rules, so a fleet admin's notification bell was
 *     quietly showing them other operators' support queries. The rules fix on
 *     2026-08-18 closed the read, which is why that listener now errors rather
 *     than leaks — but the query itself was always wrong and is fixed here.
 *
 *  2. PERMANENTLY BROKEN FOR FLEET ADMINS. Firestore evaluates list queries
 *     against the rules up front and only permits a query it can prove is safe
 *     for every possible result. The application collections are read-gated on
 *     fleet ownership, so an unscoped list can never satisfy them. Two of these
 *     three listeners had therefore been failing for fleet admins since the day
 *     role scoping was introduced, producing the permission-denied errors that
 *     appear on every admin page load.
 *
 *  3. `queries` IS DEAD. It was superseded by the unified `tickets` collection
 *     in task #157 and nothing writes to it any more, so even for Super Admin
 *     that listener could only ever surface stale history. Repointed.
 *
 * Scoped sources deliberately do NOT use `orderBy`. An equality filter plus an
 * orderBy on a different field requires a composite index, and a missing index
 * fails the listener outright — the exact failure mode this function exists to
 * remove. Sorting a small tenant-scoped window client-side avoids depending on
 * an index that has to be created by hand in the Firebase console.
 */
function notificationSourcesFor(role: string | null, fleetId: string | null): NotificationSource[] {
  if (role === "super_admin") {
    return [
      {
        col: "fleetApplications",
        label: (d) => `New fleet application — ${d.fleetName || d.businessName || "Unnamed"}`,
        kind: "Fleet",
      },
      {
        col: "driverApplications",
        label: (d) => `New driver application — ${d.fullName || d.username || "Unnamed"}`,
        kind: "Driver",
      },
      {
        col: "tickets",
        label: (d) => `New ticket — ${d.subject || d.message || "Untitled"}`,
        kind: "Ticket",
      },
    ]
  }
  if (role === "fleet_admin" && fleetId) {
    return [
      {
        col: "driverApplications",
        label: (d) => `Driver — ${d.fullName || d.username || "Unnamed"}`,
        kind: "Driver",
        scope: ["fleetId", fleetId],
      },
      {
        col: "tickets",
        label: (d) => `Ticket — ${d.subject || d.message || "Untitled"}`,
        kind: "Ticket",
        scope: ["fleetId", fleetId],
      },
    ]
  }
  // Unknown or unscoped role: show nothing rather than attempt a read that
  // the rules will refuse.
  return []
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
function NotificationBell({ role, fleetId }: { role: string | null; fleetId: string | null }) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Notification[]>([])
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  React.useEffect(() => {
    setItems([])
    const sources = notificationSourcesFor(role, fleetId)
    if (sources.length === 0) return
    const unsubs = sources.map(({ col, label, kind, scope }) => {
      const q = scope
        ? query(collection(db, col), where(scope[0], "==", scope[1]), limit(20))
        : query(collection(db, col), orderBy("createdAt", "desc"), limit(5))
      return onSnapshot(
        q,
        (snap) => {
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
        },
        // An unhandled listener rejection surfaces as "Uncaught Error in
        // snapshot listener" with no indication of which collection failed.
        // Name it.
        (error) => {
          console.error(`Notification listener failed for "${col}":`, error)
          setItems((prev) => prev.filter((p) => p.source !== col))
        }
      )
    })
    return () => unsubs.forEach((u) => u())
  }, [role, fleetId])
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
/**
 * Which role is allowed to view a given /admin/* path. Added 2026-08-17 —
 * see BLAK_IMPLEMENTATION_STATUS.md Phase 2. Previously AdminShell only
 * checked "is anyone signed in", which meant a driver's or a fleet
 * admin's account could load the Super Admin dashboard and vice versa —
 * there was no role concept anywhere in the app. This function is the
 * single place that decides which role a path requires; individual pages
 * don't need to opt in.
 */
function requiredRoleFor(pathname: string | null): string | null {
  if (!pathname) return null
  if (pathname.startsWith("/admin/super")) return "super_admin"
  if (pathname.startsWith("/admin/fleet")) return "fleet_admin"
  return null
}
function homeForRole(role: string | null | undefined): string {
  if (role === "super_admin") return "/admin/super"
  if (role === "fleet_admin") return "/admin/fleet"
  if (role === "driver") return "/driver"
  return "/"
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
  const [role, setRole] = React.useState<string | null>(null)
  const [fleetId, setFleetId] = React.useState<string | null>(null)
  const healAttemptedRef = React.useRef(false)
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const loginHref = pathname?.startsWith("/admin/fleet") ? "/admin/fleet/login" : "/admin/super/login"
      if (!user) {
        router.replace(loginHref)
        return
      }
      const required = requiredRoleFor(pathname)
      let tokenResult = await user.getIdTokenResult()
      let currentRole = tokenResult.claims.role as string | undefined
      // Self-heal. The old condition was `if (!role)` — missing claim only —
      // which made a WRONG role stickier than a missing one: a stale or
      // incorrect claim cached in the session could never be corrected from
      // inside the app. That is exactly what happened during the accidental
      // demotion on 2026-08-18 and it forced a manual IndexedDB clear to
      // recover. Now a claim that disagrees with the page's requirement also
      // triggers one re-sync before we give up and redirect.
      //
      // Safe to call on mismatch: PR #25 made syncClaimsForUser strictly
      // non-destructive — it may grant or correct a claim, never revoke one —
      // so this cannot escalate anyone into a role they don't hold. Guarded
      // by a ref so it runs at most once per mount and cannot loop.
      const needsHeal = !currentRole || (required !== null && currentRole !== required)
      if (needsHeal && !healAttemptedRef.current) {
        healAttemptedRef.current = true
        try {
          await fetch("/api/admin/backfill-claims", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenResult.token}` },
          })
          tokenResult = await user.getIdTokenResult(true)
          currentRole = tokenResult.claims.role as string | undefined
        } catch {
          // fall through — worst case, the claim is unchanged and we route
          // below rather than guess.
        }
      }
      setRole(currentRole ?? null)
      setFleetId((tokenResult.claims.fleetId as string | undefined) ?? null)
      if (!required) {
        // Not a role-scoped path (shouldn't happen for anything AdminShell
        // wraps today, but fail open to "signed in" rather than block).
        setAuthChecked(true)
        return
      }
      if (!currentRole) {
        router.replace(loginHref)
        return
      }
      if (currentRole !== required) {
        router.replace(homeForRole(currentRole))
        return
      }
      setAuthChecked(true)
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
            <NotificationBell role={role} fleetId={fleetId} />
            <ProfileMenu welcomeName={welcomeName} />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
