import React from "react"

import { getTranslations } from "next-intl/server"
import { Container } from "@/components/container"

export const PartnerCTA = async () => {
  const t = await getTranslations("partner.earlyPartnerProgram")
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

          <div className="mx-auto max-w-xl space-y-4 text-center">
            <p className="text-muted-foreground">{t("description")}</p>
            <p className="text-sm text-muted-foreground italic">{t("note")}</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
