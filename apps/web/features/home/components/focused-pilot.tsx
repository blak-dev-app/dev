import { Container } from "@/components/container"
import React from "react"
import { DATA } from "../data"
import { getTranslations } from "next-intl/server"

export const FocusedPilot = async () => {
  const t = await getTranslations("home.focusedPilot")
  return (
    <section className="py-24">
      <Container>
        <div className="space-y-16">
          <div className="space-y-2 text-center">
            <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-sm font-medium text-transparent uppercase">
              {t("subtitle")}
            </span>
            <h3 className="text-center text-4xl font-semibold">{t("title")}</h3>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {DATA.focusedPilot.map((pilot) => (
              <div
                key={pilot.translationKey}
                className="relative rounded-lg bg-secondary px-10 py-10"
              >
                <span className="absolute top-11 left-0 z-1 h-6 w-1 rounded-r-full bg-primary"></span>
                <h4 className="text-xl font-semibold">
                  {t(`items.${pilot.translationKey}.title`)}
                </h4>
                <p className="mt-4 text-muted-foreground">
                  {t(`items.${pilot.translationKey}.subtitle`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
