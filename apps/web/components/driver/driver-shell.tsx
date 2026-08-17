"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { cn } from "@blak/ui/lib/utils"
import { driverNavItems } from "@/lib/admin/nav"

function initials(name?: string) {
  if (!name) return "DR"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
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
            <p className="text-sm font-semibold">{welcomeName || "Driver"}</p>
            <p className="text-xs text-muted-foreground">BLAK Driver Dashboard</p>
          </div>
          <nav className="flex flex-col p-1.5">
            <Link
              href="/driver/dashboard/profile"
              className="rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              My profile
            </Link>
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

function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  // No `notifications` collection exists yet anywhere in the app — see
  // BLAK_IMPLEMENTATION_STATUS.md Phase 13. This stays a real, working
  // empty state rather than a fabricated unread count/list.
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">No notifications yet.</p>
        </div>
      )}
    </div>
  )
}

function homeForRole(role: string | null | undefined): string {
  if (role === "super_admin") return "/admin/super"
  if (role === "fleet_admin") return "/admin/fleet"
  if (role === "driver") return "/driver"
  return "/"
}

type DriverShellProps = {
  welcomeName?: string
  children: React.ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
}

/**
 * Post-approval Driver Dashboard shell â parallel to
 * components/admin/admin-shell.tsx but for the /driver/dashboard/* routes.
 * See BLAK_IMPLEMENTATION_STATUS.md Phase 5.
 *
 * Guards on two things, not just one:
 *  1. role === "driver", with the same self-heal-via-backfill-claims
 *     pattern as AdminShell (role/driverId claims are set at invite time
 *     â see api/admin/invite/route.ts â long before an application is
 *     Active, so a claim alone doesn't mean "approved").
 *  2. The driver's own driverApplications doc has status === "Active".
 *     Someone mid-onboarding (documents not yet reviewed, or rejected)
 *     already has role: "driver" too, and should land back on the
 *     /driver onboarding hub instead of an empty post-approval dashboard.
 */
export function DriverShell({ welcomeName, children, searchValue, onSearchChange }: DriverShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [authChecked, setAuthChecked] = React.useState(false)
  const [localSearch, setLocalSearch] = React.useState("")

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/driver/login")
        return
      }

      let tokenResult = await user.getIdTokenResult()
      let role = tokenResult.claims.role as string | undefined
      let driverId = tokenResult.claims.driverId as string | undefined

      if (!role) {
        try {
          await fetch("/api/admin/backfill-claims", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenResult.token}` },
          })
          tokenResult = await user.getIdTokenResult(true)
          role = tokenResult.claims.role as string | undefined
          driverId = tokenResult.claims.driverId as string | undefined
        } catch {
          // fall through â worst case role stays undefined, handled below.
        }
      }

      if (!role) {
        router.replace("/driver/login")
        return
      }

      if (role !== "driver" || !driverId) {
        router.replace(homeForRole(role))
        return
      }

      try {
        const snap = await getDoc(doc(db, "driverApplications", driverId))
        const status = snap.exists() ? snap.data().status : undefined
        if (status !== "Active") {
          router.replace("/driver")
          return
        }
      } catch {
        router.replace("/driver")
        return
      }

      setAuthChecked(true)
    })
    return () => unsub()
  }, [router])

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
          {driverNavItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
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
