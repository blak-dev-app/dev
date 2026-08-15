import React from "react"
import { Container } from "@/components/container"
import { DATA } from "../data"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@blak/ui/components/carousel"
import { getTranslations } from "next-intl/server"

export const ExperienceJourney = async () => {
  const t = await getTranslations("home.experienceJourney")
  return (
    <section className="pb-24">
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
              {DATA.benefits.map((benifit) => (
                <CarouselItem
                  key={benifit.translationKey}
                  className="basis-3/4 pl-6 md:basis-1/2 lg:basis-1/4"
                >
                  <div className="grid gap-6">
                    <div className="aspect-square overflow-hidden rounded-xl bg-neutral-900">
                      <Image
                        src={benifit.image}
                        alt="Benifit"
                        width={800}
                        height={600}
                        className="h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    <div className="grid gap-2">
                      <h3 className="text-2xl font-semibold">
                        {t(`items.${benifit.translationKey}.title`)}
                      </h3>
                      <p className="text-muted-foreground">
                        {t(`items.${benifit.translationKey}.description`)}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext className="lg:hidden" />
            <CarouselPrevious className="lg:hidden" />
          </Carousel>
        </div>
      </Container>
    </section>
  )
}
