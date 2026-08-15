import { UserRound } from "lucide-react"
import Link from "next/link"
import React from "react"

export const HeaderProfile = () => {
  return (
    <Link
      href="/auth/signin"
      className="inline-flex h-full items-center justify-center gap-2.5 uppercase"
    >
      <UserRound className="size-4" />
      Login / Register
    </Link>
  )
}
