import React from "react"
import { Container } from "@/components/container"
import { getTranslations } from "next-intl/server"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@blak/ui/components/carousel"
import { DATA } from "../partner.data"

export const PartnerBenifits = async () => {
  const t = await getTranslations("partner.partnerBenefits")
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
          <Carousel>
            <CarouselContent className="-ml-6">
              {DATA.partnerBenifits.map((benifit) => (
                <CarouselItem
                  key={benifit}
                  className="basis-2/3 pl-6 md:basis-1/2 lg:basis-1/4"
                >
                  <div className="relative h-full rounded-lg bg-secondary px-10 py-10">
                    <span className="absolute top-11 left-0 z-1 h-6 w-1 rounded-r-full bg-primary" />
                    <div className="grid gap-4">
                      <h3 className="text-2xl font-semibold">
                        {t(`items.${benifit}.title`)}
                      </h3>
                      <p className="text-muted-foreground">
                        {t(`items.${benifit}.description`)}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext />
            <CarouselPrevious />
          </Carousel>
        </div>
      </Container>
    </section>
  )
}
