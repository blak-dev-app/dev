import React from "react"
import { getTranslations } from "next-intl/server"
import { Container } from "@/components/container"
import { ApplicantTypeSwitcher } from "./applicant-type-switcher"

export const OperatorFormSection = async () => {
  const t = await getTranslations("operator.form")
  return (
    <section className="pt-32 pb-24 md:pt-40">
      <Container>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="flex max-w-xl flex-col gap-6">
            <h3 className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-[2.5rem]/tight font-bold text-transparent md:text-6xl/tight">
              {t("title")}
            </h3>
            <p className="text-lg font-medium text-muted-foreground">
              {t("description")}
            </p>
            <p className="text-lg font-medium text-muted-foreground">
              {t("note")}
            </p>
          </div>
          <div>
            <ApplicantTypeSwitcher />
          </div>
        </div>
      </Container>
    </section>
  )
}
