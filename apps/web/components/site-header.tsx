import React from "react"

import Image from "next/image"
import { NAV } from "@/lib/config/nav"
import { Container } from "./container"
import { Button } from "@blak/ui/components/button"
import { LocaleSelector } from "./locale-selector"
import { Link } from "@/i18n/navigation"
import { MobileDrawer } from "./mobile-drawer"

export const SiteHeader = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex items-center gap-12 py-4">
          <div className="flex-1 shrink-0">
            <Link href="/">
              <Image
                src="/logo/logo.png"
                width={160}
                height={42}
                alt="Black"
                className="mix-blend-difference"
                loading="eager"
              />
            </Link>
          </div>
          <nav className="hidden self-stretch lg:flex">
            <ul className="flex h-full items-center justify-end gap-6">
              {NAV.map((link) => {
                return (
                  <li key={link.href + link.label}>
                    <Link
                      className="relative inline-flex items-center justify-center py-4 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:scale-x-0 after:bg-primary after:transition hover:after:scale-x-100"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="flex justify-end gap-3">
            <LocaleSelector className="hidden lg:inline-flex" />
            <Button
              className="hidden uppercase lg:inline-flex"
              variant="primary-outline"
              asChild
            >
              <Link href="/partners">Partner with Blak</Link>
            </Button>
            <MobileDrawer className="ml-auto lg:hidden" />
          </div>
        </div>
      </Container>
    </header>
  )
}
