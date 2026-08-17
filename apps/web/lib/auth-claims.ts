"use client"

import * as React from "react"
import { onIdTokenChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import type { UserRole } from "@/lib/types"

export interface AdminClaimsState {
  role: UserRole | null
  fleetId: string | null
  driverId: string | null
  loading: boolean
}

/**
 * Reads the signed-in user's custom claims (role/fleetId/driverId) straight
 * off their Firebase ID token. Re-runs whenever the token changes (sign-in,
 * sign-out, or a forced refresh via getIdToken(true)).
 *
 * Added 2026-08-17 as part of the role-isolation fix — see
 * BLAK_IMPLEMENTATION_STATUS.md Phase 2. Every fleet-scoped or
 * driver-scoped Firestore query should get its fleetId/driverId from here,
 * never from a manually-entered or URL value (see spec section 31: "A
 * Fleet Admin must not be able to change the fleetId of arbitrary records
 * to gain access to another fleet").
 *
 * IMPORTANT: setCustomUserClaims() on the server does NOT retroactively
 * update a token already cached on the client — the user must sign in
 * again, or something must call getIdToken(true), before a newly-granted
 * role/fleetId is visible here. AdminShell/DriverShell handle that
 * one-time refresh automatically (see components/admin/admin-shell.tsx).
 */
export function useAdminClaims(): AdminClaimsState {
  const [claims, setClaims] = React.useState<AdminClaimsState>({
    role: null,
    fleetId: null,
    driverId: null,
    loading: true,
  })

  React.useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setClaims({ role: null, fleetId: null, driverId: null, loading: false })
        return
      }
      const token = await user.getIdTokenResult()
      setClaims({
        role: (token.claims.role as UserRole) || null,
        fleetId: (token.claims.fleetId as string) || null,
        driverId: (token.claims.driverId as string) || null,
        loading: false,
      })
    })
    return () => unsub()
  }, [])

  return claims
}
