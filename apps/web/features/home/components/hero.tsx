import Image from "next/image"

import { Button } from "@blak/ui/components/button"
import { Container } from "@/components/container"
import { ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { Badge } from "@blak/ui/components/badge"

export async function Hero() {
  const t = await getTranslations("home.hero")

  return (
    <section className="relative isolate h-full overflow-hidden">
      <div className="grid grid-cols-1 grid-rows-2">
        <div className="col-span-2 col-start-1 row-span-2 row-start-1">
          <Image
            src="/blak-banner-sm.jpg"
            alt="BLAK vehicle on a city rooftop at dusk"
            width={1800}
            height={800}
            priority
            sizes="100vw"
            loading="eager"
            className="min-h-svh w-full object-cover object-center transition-opacity duration-500 fade-in md:hidden"
          />
          <Image
            src="/blak-banner.jpg"
            alt="BLAK vehicle on a city rooftop at dusk"
            width={1800}
            height={1000}
            priority
            sizes="100vw"
            loading="eager"
            className="hidden min-h-svh w-full object-cover object-center transition-opacity duration-500 fade-in md:block"
          />
        </div>
        <div className="col-span-2 col-start-1 row-span-2 row-start-1 bg-linear-to-t from-background">
          <Container className="flex h-full flex-col justify-center p-6 md:p-8 lg:justify-start">
            <div className="mx-auto w-full md:max-w-3xl">
              <div className="space-y-8 pt-32 pb-10 text-center md:pt-40">
                <h1 className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-[2.5rem]/tight font-bold text-transparent md:text-6xl/tight">
                  {t("title")}
                </h1>
                <p className="mx-auto max-w-2xl font-medium">
                  {t("description")}
                </p>

                <div className="flex flex-col justify-center gap-6 sm:flex-row">
                  <div className="grid gap-2 text-center">
                    <Button
                      className="uppercase"
                      suffix={<ArrowRight />}
                      asChild
                    >
                      <Link href="/partners">{t("partner.label")}</Link>
                    </Button>
                    <span className="text-xs text-muted-foreground italic">
                      {t("partner.description")}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Button
                      variant="secondary"
                      className="uppercase"
                      suffix={<ArrowRight />}
                      asChild
                    >
                      <Link href="/operator">{t("operator.label")}</Link>
                    </Button>

                    <span className="text-xs text-muted-foreground italic">
                      {t("operator.description")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </section>
  )
}
