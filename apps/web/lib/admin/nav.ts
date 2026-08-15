export type AdminNavItem = {
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

export const superNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/super" },
  { label: "Fleets", href: "/admin/super/fleets" },
  { label: "Drivers", href: "/admin/super/drivers" },
  { label: "Passengers", href: "/admin/super/passengers" },
  { label: "Vehicles", href: "/admin/super/vehicles" },
  { label: "Tickets", href: "/admin/super/tickets" },
]

export const fleetNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/fleet" },
  { label: "Drivers", href: "/admin/fleet/drivers" },
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
]
