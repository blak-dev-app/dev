import { Container } from "@/components/container"
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@blak/ui/components/timeline"
import React from "react"
import { DATA } from "../operator.data"
import { getTranslations } from "next-intl/server"

export const OperatorProcess = async () => {
  const t = await getTranslations("operator.process")
  return (
    <section>
      <Container>
        <div className="space-y-16">
          <div className="space-y-2 text-center">
            <span className="bg-linear-to-r from-primary to-foreground bg-clip-text text-sm font-medium text-transparent uppercase">
              {t("subtitle")}
            </span>
            <h3 className="text-center text-4xl font-semibold">{t("title")}</h3>
          </div>
          <Timeline defaultValue={2} className="mx-auto w-full max-w-3xl gap-6">
            {DATA.process.map((process, i) => (
              <TimelineItem
                key={process}
                step={1}
                className="border-b-2 group-data-[orientation=vertical]/timeline:last:pb-6!"
              >
                <TimelineHeader className="relative w-full">
                  <span className="absolute top-0 right-0 inline-block font-semibold tracking-widest text-muted-foreground uppercase">
                    {i + 1}/{DATA.process.length}
                  </span>
                  <TimelineTitle className="text-xl font-semibold">
                    {t(`items.${process}.title`)}
                  </TimelineTitle>
                </TimelineHeader>
                <TimelineIndicator />
                <TimelineSeparator />
                <TimelineContent className="mt-4 text-base text-muted-foreground">
                  {t(`items.${process}.description`)}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      </Container>
    </section>
  )
}
