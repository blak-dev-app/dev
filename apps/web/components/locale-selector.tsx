"use client"

import { useLocale } from "next-intl"

import { usePathname, useRouter } from "@/i18n/navigation"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@blak/ui/components/popover"
import { Button } from "@blak/ui/components/button"
import { Check, ChevronsUpDown, Globe } from "lucide-react"

const LOCALES = [
  {
    value: "en",
    label: "English",
  },
  {
    value: "es",
    label: "Español",
  },
] as const

export function LocaleSelector({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, {
      locale: nextLocale as "en" | "es",
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" className={className}>
          <Globe />
          {LOCALES.find((loc) => loc.value === locale)?.label}
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-(--radix-popover-trigger-width) gap-px p-1 **:justify-start">
        {LOCALES.map((item) => (
          <Button
            key={item.value}
            value={item.value}
            onClick={() => handleLocaleChange(item.value)}
            size="sm"
            variant={item.value === locale ? "secondary" : "ghost"}
            className="shadow-none"
          >
            {item.label}
            {item.value === locale && (
              <Check className="ml-auto text-muted-foreground" />
            )}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
