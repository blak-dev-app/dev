import React from "react"
import { Container } from "@/components/container"
import { DATA } from "../data"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@blak/ui/components/carousel"
import { getTranslations } from "next-intl/server"

export const TravelExperience = async () => {
  const t = await getTranslations("home.travelExperience")
  return (
    <section className="py-24">
      <Container>
        <div className="space-y-16">
          <h2 className="flex flex-col items-center gap-2">
            <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-sm font-medium text-transparent uppercase">
              {t("subtitle")}
            </span>
            <span className="text-center text-4xl font-semibold">
              {t("title")}
            </span>
          </h2>

          <Carousel>
            <CarouselContent className="-ml-6">
              {DATA.categories.map((cat) => (
                <CarouselItem
                  key={cat.translationKey}
                  className="basis-2/3 pl-6 md:basis-1/3 lg:basis-1/4 2xl:basis-1/6"
                >
                  <div className="flex h-full flex-col items-center gap-10 rounded-xl bg-neutral-900 px-6 py-10">
                    <span className="inline-flex size-16 items-center justify-center rounded-lg bg-primary/20">
                      <cat.icon className="size-8 text-primary" />
                    </span>
                    <div className="grid gap-1 text-center">
                      <p className="font-medium">
                        {t(`items.${cat.translationKey}.title`)}
                      </p>
                      <p className="text-muted-foreground">
                        {t(`items.${cat.translationKey}.subtitle`)}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="2xl:hidden" />
            <CarouselNext className="2xl:hidden" />
          </Carousel>
        </div>
      </Container>
    </section>
  )
}
