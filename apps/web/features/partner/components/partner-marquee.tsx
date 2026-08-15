import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@blak/ui/components/marquee"
import React from "react"
import { DATA } from "../partner.data"
import { getTranslations } from "next-intl/server"

export const PartnerMarquee = async () => {
  const t = await getTranslations("partner.services")
  return (
    <section className="border-y bg-secondary/50 py-6">
      <Marquee>
        <MarqueeContent className="text-muted-foreground uppercase">
          {Array.from({ length: 4 }, (_, repeat) =>
            DATA.services.map((item, i) => (
              <React.Fragment key={`${repeat}-${i}`}>
                <MarqueeItem>{t(`${item}`)}</MarqueeItem>
                <MarqueeItem>◆</MarqueeItem>
              </React.Fragment>
            ))
          )}
        </MarqueeContent>
      </Marquee>
    </section>
  )
}
