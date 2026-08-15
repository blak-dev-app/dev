import { Globe } from "@/components/assets/globe"
import { Container } from "@/components/container"
import { getTranslations } from "next-intl/server"

export async function PartnerHero() {
  const t = await getTranslations("partner.hero")

  return (
    <section className="isolate h-full overflow-hidden lg:max-h-140">
      <Container>
        <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-2">
          <div className="flex h-full flex-col justify-start">
            <div className="w-full space-y-8 pt-32 pb-10 md:max-w-xl md:pt-40">
              <h1 className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-[2.5rem]/tight font-bold text-transparent md:text-6xl/tight">
                {t("title")}
              </h1>

              <p className="text-muted-foreground lg:text-lg lg:font-medium">
                {t("description")}
              </p>
            </div>
          </div>
          <div className="max-h-80 lg:translate-y-32">
            <Globe />
          </div>
        </div>
      </Container>
    </section>
  )
}
