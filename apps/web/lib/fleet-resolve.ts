import type { Firestore } from "firebase-admin/firestore"

/**
 * Best-effort resolution of a driver's fleetId from the denormalized
 * fleetName string still used across most of the app (see lib/types.ts —
 * Driver.fleetName is what onboarding forms actually collect; fleetId is
 * derived from it here rather than being collected directly).
 *
 * Matches against fleetApplications.fleetName / businessName. Returns null
 * if there's no name, no match, or more than one ambiguous match — an
 * independent driver, or a name we can't confidently resolve, is safer
 * left unlinked than guessed wrong (spec section 42/43: no fabricated
 * relationships).
 */
export async function resolveFleetIdByName(
  db: Firestore,
  fleetName: string | undefined | null
): Promise<string | null> {
  if (!fleetName || !fleetName.trim()) return null
  const name = fleetName.trim()

  const byFleetName = await db.collection("fleetApplications").where("fleetName", "==", name).limit(2).get()
  if (byFleetName.size === 1) return byFleetName.docs[0]!.id
  if (byFleetName.size > 1) return null

  const byBusinessName = await db.collection("fleetApplications").where("businessName", "==", name).limit(2).get()
  if (byBusinessName.size === 1) return byBusinessName.docs[0]!.id

  return null
}
