"use client"
import React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@blak/ui/components/popover"
import { NAV } from "@/lib/config/nav"
import { Link } from "@/i18n/navigation"
import { AlignJustify, X } from "lucide-react"
import { Button } from "@blak/ui/components/button"
import { LocaleSelector } from "./locale-selector"
import { cn } from "@blak/ui/lib/utils"

export const MobileDrawer = ({ className }: { className?: string }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-11", className)}
        >
          {open ? <X /> : <AlignJustify className="size-6!" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={18}
        className="h-(--radix-popper-available-height) w-(--radix-popper-available-width) gap-20 rounded-none bg-background/80 px-6 py-8 backdrop-blur-md"
      >
        <nav className="flex-1 overflow-auto">
          <ul className="flex flex-col gap-2">
            {NAV.map((nav) => {
              return (
                <li key={nav.label}>
                  <Link
                    href={nav.href}
                    className="inline-flex w-full justify-start text-2xl font-semibold"
                    onClick={() => setOpen(false)}
                  >
                    {nav.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="grid gap-3">
          <LocaleSelector />
          <Button className="uppercase" variant="primary-outline" asChild>
            <Link href="/partners">Partner with Blak</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
