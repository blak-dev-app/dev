import Link from "next/link"
import Image from "next/image"
import { Container } from "./container"
import { POLICIES, USEFUL_LINKS } from "@/lib/config/nav"
import { Mail } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <Container className="py-16">
        <div className="flex flex-col items-start justify-end gap-8 md:flex-row">
          <div className="relative inline-block">
            <Link href="/">
              <Image
                src="/logo/logo.png"
                width={180}
                height={100}
                alt="Black"
                loading="eager"
              />
            </Link>
            <p className="bg-linear-to-r from-primary to-foreground bg-clip-text text-base font-semibold text-transparent">
              A First Class Experience
            </p>
          </div>
          <div className="grid gap-2 self-start md:ml-auto">
            <a
              className="inline-flex items-center justify-center gap-3 text-sm hover:underline"
              href="mailto:inquiry@rideblak.com"
            >
              <Mail className="size-4" />
              inquiry@rideblak.com
            </a>
          </div>
          <div className="grid md:self-end">
            <ul className="grid gap-0.5">
              {USEFUL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block text-sm transition hover:translate-x-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
      <div className="border-t">
        <Container className="py-4">
          <div className="flex flex-col flex-col-reverse gap-4 md:flex-row">
            <div className="flex-1 text-sm">
              © {new Date().getFullYear()} BLAK. All rights reserved.
            </div>
            <div>
              <ul className="flex gap-4 md:justify-end">
                {POLICIES.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  )
}
