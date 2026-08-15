import { Globe } from "@/components/assets/globe"
import { Container } from "@/components/container"
import { getTranslations } from "next-intl/server"
import { PartnerForm } from "../forms/partner-form"

export const PartnerFormSection = async () => {
  const t = await getTranslations("partner.form")
  return (
    <section className="py-24">
      <Container>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="flex max-w-xl flex-col gap-6">
            <span className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-[2.5rem]/tight font-bold text-transparent md:text-6xl/tight">
              {t("title")}
            </span>
            <p className="text-lg font-medium text-muted-foreground">
              {t("description")}
            </p>
            <p className="text-lg font-medium text-muted-foreground">
              {t("note")}
            </p>
          </div>
          <div>
            <PartnerForm />
          </div>
        </div>
      </Container>
    </section>
  )
}
