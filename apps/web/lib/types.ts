/**
 * BLAK canonical entity types.
 *
 * Source of truth for every collection is documented per-type below. Field
 * names here reflect what the live app actually reads/writes today (verified
 * against apps/web/app/admin/** and apps/web/app/driver/** on 2026-08-16),
 * NOT an idealized future schema. Fields marked "not yet populated" are part
 * of the target schema from the BLAK Production-Ready Master Prompt but are
 * not written by any current code path â they're included so future work can
 * add them additively without another types rewrite.
 *
 * Do not use `any` for these entities going forward â import from here.
 */

import type { Timestamp } from "firebase/firestore"

/** Firestore timestamp as read from a snapshot, or already-converted Date, or undefined/null before hydration. */
export type FirestoreTimestamp = Timestamp | Date | string | null | undefined

/**
 * The three admin/operator account roles, stored as a Firebase Auth custom
 * claim (`request.auth.token.role` in firestore.rules) â see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 2. Passenger accounts don't exist in
 * the codebase yet, so there is no "passenger" role here; add one when that
 * app ships rather than guessing its shape now.
 */
export type UserRole = "super_admin" | "fleet_admin" | "driver"

/**
 * Shape of the custom claims set via adminAuth().setCustomUserClaims() and
 * read back via getIdTokenResult().claims. fleetId is only ever set for
 * fleet_admin and driver roles; driverId only for driver. Set at invite
 * time (api/admin/invite), refreshed at approval time
 * (api/admin/final-decision), and self-healed for pre-existing accounts by
 * api/admin/backfill-claims.
 */
export interface AuthClaims {
  role?: UserRole
  fleetId?: string
  driverId?: string
}

export type DriverStatus =
  | "Pending Review"
  | "Approved"
  | "Invited"
  | "Documents Submitted"
  | "Active"
  | "Rejected"
  // Target states from the master prompt not yet used by any code path:
  | "Applied"
  | "Documents Pending"
  | "Inactive"
  | "Suspended"

/** Collection: `driverApplications` */
export interface Driver {
  id: string
  fullName?: string
  username?: string
  email?: string
  phone?: string
  address?: string
  passportId?: string
  ssn?: string
  insuranceNumber?: string
  vehicleType?: string
  fleetName?: string
  /**
   * Resolved from fleetName and actively backfilled by
   * /api/admin/invite, /api/admin/final-decision, and
   * /api/admin/backfill-claims (see BLAK_IMPLEMENTATION_STATUS.md
   * Phase 2). Still optional: an independent driver, or a fleetName that
   * doesn't uniquely match a fleetApplications doc, is left unlinked
   * rather than guessed â see lib/fleet-resolve.ts.
   */
  fleetId?: string
  status?: DriverStatus
  authUid?: string
  rating?: number
  reviewCount?: number
  totalEarnings?: number
  totalPayout?: number
  totalDeduction?: number
  createdAt?: FirestoreTimestamp
}

export type FleetStatus = "Pending Review" | "Approved" | "Invited" | "Documents Submitted" | "Rejected"

/** Collection: `fleetApplications` */
export interface Fleet {
  id: string
  fleetName?: string
  businessName?: string
  email?: string
  phone?: string
  vehicles?: number
  source?: string
  status?: FleetStatus
  createdAt?: FirestoreTimestamp
}

export type VehicleStatus = "Available" | "Driver Assigned" | "Breakdown"
// Target states from the master prompt not yet used: "Maintenance" | "Inactive"

/** Collection: `vehicles` */
export interface Vehicle {
  id: string
  vehicleType?: string
  driverId?: string
  driverName?: string
  /**
   * Backfilled from the owning driver's fleetId by
   * /api/admin/backfill-claims whenever a vehicle has a driverId but no
   * fleetId of its own â see BLAK_IMPLEMENTATION_STATUS.md Phase 2.
   * Still optional for vehicles with no driver assigned yet.
   */
  fleetId?: string
  status?: VehicleStatus
  createdAt?: FirestoreTimestamp
}

export type PassengerStatus = "Active" | "Inactive" | "Blocked"

/** Collection: `passengers` (no live signups yet as of 2026-08-16) */
export interface Passenger {
  id: string
  fullName?: string
  name?: string
  email?: string
  phone?: string
  totalRides?: number
  status?: PassengerStatus
  createdAt?: FirestoreTimestamp
}

export type RideStatus = "Pending" | "Completed" | "Running" | "Cancelled"
// Target status machine from the master prompt (Section 19) not yet implemented as a
// centralized transition service anywhere in the codebase:
// REQUESTED -> ACCEPTED -> DRIVER_ARRIVING -> DRIVER_ARRIVED -> IN_PROGRESS -> COMPLETED

/** Collection: `rides` */
export interface Ride {
  id: string
  bookingId?: string
  passengerId?: string
  passengerName?: string
  driverId?: string
  driverName?: string
  vehicleName?: string
  blakId?: string
  /**
   * Added 2026-08-17 for fleet-scoped Firestore rules/queries â see
   * BLAK_IMPLEMENTATION_STATUS.md Phase 2. Only populated on rides
   * created after this rollout; historical rides predating it have no
   * reliable source of which fleet applied at the time, and are
   * deliberately NOT backfilled (guessing would fabricate history â spec
   * sections 18-19, 42-43). Those rides are only visible to super_admin
   * until a real backfill source of truth exists.
   */
  fleetId?: string
  from?: string
  to?: string
  pickup?: { address?: string }
  drop?: { address?: string }
  distance?: string
  duration?: string
  startTime?: FirestoreTimestamp
  endTime?: FirestoreTimestamp
  driverRating?: number
  amountPaid?: number
  receiptUrl?: string
  status?: RideStatus
  createdAt?: FirestoreTimestamp
}

export type TransactionType = "credit" | "debit"

/** Collection: `transactions` */
export interface Transaction {
  id: string
  paymentId?: string
  bookingId?: string
  name?: string
  paidBy?: string
  userType?: string
  paymentMode?: string
  type?: TransactionType
  amount?: number
  status?: string
  /**
   * Added 2026-08-17 alongside `fleetId` below for fleet/driver-scoped
   * Firestore rules/queries â see BLAK_IMPLEMENTATION_STATUS.md Phase 2.
   * Same historical-backfill caveat as Ride.fleetId: only populated on
   * transactions created after this rollout.
   */
  driverId?: string
  fleetId?: string
  createdAt?: FirestoreTimestamp
}

export type CouponType = "Flat Percentage" | "Flat Amount" | "Conditional Discount"
export type CouponStatus = "Active" | "Inactive"

/**
 * Collection: `coupons`
 *
 * NOTE: `value` is currently a free-text string (e.g. "20%" or "$50") rather
 * than a validated numeric amount, and there is no usageLimit/minFare/expiry
 * enforcement â this is a known gap tracked under Phase 6 (Financials) /
 * Section 22 of the master prompt.
 */
export interface Coupon {
  id: string
  code?: string
  type?: CouponType
  value?: string
  validFrom?: string
  validTo?: string
  status?: CouponStatus
  createdAt?: FirestoreTimestamp
}

/**
 * Canonical unified support-ticket model (collection: `tickets`).
 *
 * Replaces the two previously-disconnected `queries` (Fleet Admin) and
 * `driverTickets` (Super Admin) collections â see PRODUCTION_READY_TRACKER.md
 * Phase 2 for the migration rationale. `audience` decides which dashboard a
 * ticket is shown in; `type` decides the Admin/Driver sub-view within Fleet
 * Admin's Queries page. Legacy `queries`/`driverTickets` docs written before
 * this migration are NOT automatically moved into `tickets` â see task
 * "Decide + migrate" for that follow-up.
 */
export interface Ticket {
  id: string
  audience?: "fleet_admin" | "super_admin"
  type?: "admin" | "driver"
  fleetId?: string
  driverId?: string
  driverName?: string
  addedBy?: string
  subject?: string
  message?: string
  status?: string
  createdAt?: FirestoreTimestamp
}

/** Subcollection: `tickets/{ticketId}/messages` */
export interface TicketMessage {
  id: string
  sender?: "fleet" | "admin" | "driver"
  message?: string
  createdAt?: FirestoreTimestamp
}

/**
 * @deprecated Legacy Fleet Admin collection, superseded by `Ticket` /
 * collection `tickets` (audience: "fleet_admin"). Kept only for reading any
 * pre-migration docs left in the old `queries` collection.
 */
export interface DriverTicket {
  id: string
  subject?: string
  createdAt?: FirestoreTimestamp
}

/**
 * @deprecated Legacy Super Admin collection, superseded by `Ticket` /
 * collection `tickets` (audience: "super_admin"). Kept only for reading any
 * pre-migration docs left in the old `driverTickets` collection.
 */
export interface FleetQuery {
  id: string
  type?: "admin" | "driver"
  subject?: string
  message?: string
  status?: string
  addedBy?: string
  driverName?: string
  createdAt?: FirestoreTimestamp
}

// ---------------------------------------------------------------------------
// Not yet implemented anywhere in the codebase (Phase 6/7/11 targets below).
// Included so future work has a stable shape to build against.
// ---------------------------------------------------------------------------

/** Target collection: `notifications` â not yet written by any code path. */
export interface Notification {
  id: string
  recipientId?: string
  recipientRole?: "super_admin" | "fleet_admin" | "driver" | "passenger"
  type?: string
  title?: string
  message?: string
  relatedEntityId?: string
  relatedEntityType?: string
  read?: boolean
  createdAt?: FirestoreTimestamp
}

/** Target collection: `auditLogs` â not yet written by any code path. */
export interface AuditLog {
  id: string
  actorId?: string
  actorRole?: string
  action?: string
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
  timestamp?: FirestoreTimestamp
}

/** Target document shape for `settings/platform` â collection does not exist yet. */
export interface PlatformSettings {
  platformFee?: number
  fleetCommission?: number
  driverCommission?: number
  minimumFare?: number
  baseFare?: number
  perKmRate?: number
  perMinuteRate?: number
  cancellationFee?: number
}
