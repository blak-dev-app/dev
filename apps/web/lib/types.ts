/**
 * BLAK canonical entity types.
 *
 * Source of truth for every collection is documented per-type below. Field
 * names here reflect what the live app actually reads/writes today (verified
 * against apps/web/app/admin/** and apps/web/app/driver/** on 2026-08-16),
 * NOT an idealized future schema. Fields marked "not yet populated" are part
 * of the target schema from the BLAK Production-Ready Master Prompt but are
 * not written by any current code path — they're included so future work can
 * add them additively without another types rewrite.
 *
 * Do not use `any` for these entities going forward — import from here.
 */

import type { Timestamp } from "firebase/firestore"

/** Firestore timestamp as read from a snapshot, or already-converted Date, or undefined/null before hydration. */
export type FirestoreTimestamp = Timestamp | Date | string | null | undefined

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
  /** Not yet populated by any code path — drivers are only linked to fleets by name today, not by ID. Needed for Phase 2 ID-relationship hardening. */
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
  /** Not yet populated — vehicles aren't linked to a fleet by ID today. */
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
  createdAt?: FirestoreTimestamp
}

export type CouponType = "Flat Percentage" | "Flat Amount" | "Conditional Discount"
export type CouponStatus = "Active" | "Inactive"

/**
 * Collection: `coupons`
 *
 * NOTE: `value` is currently a free-text string (e.g. "20%" or "$50") rather
 * than a validated numeric amount, and there is no usageLimit/minFare/expiry
 * enforcement — this is a known gap tracked under Phase 6 (Financials) /
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
 * Two disconnected ticket systems exist today (see PRODUCTION_READY_TRACKER.md
 * Phase 2). Both are typed below as they currently exist; unifying them into
 * one canonical `Ticket` model is tracked separately and intentionally not
 * done here to avoid an unreviewed data migration.
 */

/** Collection: `driverTickets` (Super Admin — driver-raised support tickets) */
export interface DriverTicket {
  id: string
  subject?: string
  createdAt?: FirestoreTimestamp
}

export type FleetQueryType = "admin" | "driver"

/** Collection: `queries` (Fleet Admin — admin- or driver-raised tickets) */
export interface FleetQuery {
  id: string
  type?: FleetQueryType
  subject?: string
  message?: string
  status?: string
  addedBy?: string
  driverName?: string
  createdAt?: FirestoreTimestamp
}

/** Subcollection: `queries/{queryId}/messages` */
export interface FleetQueryMessage {
  id: string
  sender?: "fleet" | "admin" | "driver"
  message?: string
  createdAt?: FirestoreTimestamp
}

// ---------------------------------------------------------------------------
// Not yet implemented anywhere in the codebase (Phase 6/7/11 targets below).
// Included so future work has a stable shape to build against.
// ---------------------------------------------------------------------------

/** Target collection: `notifications` — not yet written by any code path. */
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

/** Target collection: `auditLogs` — not yet written by any code path. */
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

/** Target document shape for `settings/platform` — collection does not exist yet. */
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
