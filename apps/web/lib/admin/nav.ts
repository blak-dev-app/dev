export type AdminNavItem = {
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

export const superNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/super" },
  { label: "Real time tracking", href: "/admin/super/tracking" },
  { label: "Fleets", href: "/admin/super/fleets" },
  { label: "Drivers", href: "/admin/super/drivers" },
  { label: "Passengers", href: "/admin/super/passengers" },
  { label: "Vehicles", href: "/admin/super/vehicles" },
  { label: "Rides", href: "/admin/super/rides" },
  { label: "Payments", href: "/admin/super/payments" },
  { label: "Coupons", href: "/admin/super/coupons" },
  { label: "Tickets", href: "/admin/super/tickets" },
]

export const fleetNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/fleet" },
  { label: "Drivers", href: "/admin/fleet/drivers" },
  { label: "Performance", href: "/admin/fleet/performance" },
  { label: "Analytics", href: "/admin/fleet/analytics" },
  { label: "Vehicles", href: "/admin/fleet/vehicles" },
  { label: "Rides", href: "/admin/fleet/rides" },
  { label: "Payments", href: "/admin/fleet/payments" },
  {
    label: "Queries",
    href: "/admin/fleet/queries",
    subItems: [
      { label: "Admin", href: "/admin/fleet/queries?type=admin" },
      { label: "Driver", href: "/admin/fleet/queries?type=driver" },
    ],
  },
  { label: "Profile", href: "/admin/fleet/profile" },
]

/**
 * Post-approval Driver Dashboard nav — added 2026-08-17, see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 2/5. The pre-existing `/driver`
 * route (onboarding: apply, upload documents, wait for approval) is
 * untouched by this addition; these items live under `/driver/dashboard/*`,
 * the real post-approval experience built out in Phase 5.
 */
export const driverNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/driver/dashboard" },
  { label: "My Rides", href: "/driver/dashboard/rides" },
  { label: "Earnings", href: "/driver/dashboard/earnings" },
  { label: "Performance", href: "/driver/dashboard/performance" },
  { label: "Documents", href: "/driver/dashboard/documents" },
  { label: "Vehicle", href: "/driver/dashboard/vehicle" },
  { label: "Support", href: "/driver/dashboard/support" },
  { label: "Profile", href: "/driver/dashboard/profile" },
]
