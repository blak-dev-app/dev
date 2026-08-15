import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@blak/ui/components/marquee"
import React from "react"
import { DATA } from "../operator.data"
import { getTranslations } from "next-intl/server"

export const OperatorMarque = async () => {
  const t = await getTranslations("operator.marquee")
  return (
    <section className="border-y bg-secondary/50 py-6">
      <Marquee>
        <MarqueeContent className="text-muted-foreground">
          {Array.from({ length: 4 }, (_, repeat) =>
            DATA.marquee.map((item, i) => (
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
