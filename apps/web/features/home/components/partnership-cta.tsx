import React from "react"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Container } from "@/components/container"
import { Button } from "@blak/ui/components/button"
import { Link } from "@/i18n/navigation"

export const PartnershipCTA = async () => {
  const t = await getTranslations("home.cta")
  return (
    <section className="bg-linear-to-r from-background via-neutral-900 to-background">
      <Container>
        <div className="space-y-8 py-24 text-center">
          <h2 className="flex flex-col items-center gap-2">
            <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-sm font-medium text-transparent uppercase">
              {t("subtitle")}
            </span>
            <span className="text-center text-4xl font-semibold">
              {t("title")}
            </span>
          </h2>

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <div className="mx-auto flex max-w-lg flex-col flex-wrap items-center justify-center gap-4 md:flex-row">
            <div className="w-full">
              <Button>DISCUSS A PILOT</Button>
            </div>
            <Button variant="link" asChild>
              <Link href="/operator">
                JOIN AS AN OPERATOR <ArrowRight />
              </Link>
            </Button>
            <Button variant="link" asChild>
              <Link href="/partners">
                PARTNERSHIP OVERVIEW <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
