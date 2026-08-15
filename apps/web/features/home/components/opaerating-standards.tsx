import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@blak/ui/components/marquee"
import React from "react"

const OperatingStandard = () => {
  return (
    <section>
      <Marquee>
        <MarqueeContent>
          {Array.from({ length: 5 }).flatMap(() =>
            [
              "Operating Standard",
              "Service Standard",
              "Global Standard",
              "Guest Standard",
              "Luxury Standard",
            ].map((standard) => (
              <MarqueeItem key={`${standard}-${crypto.randomUUID()}`}>
                <span className="text-sm text-muted-foreground">
                  {standard}
                </span>
              </MarqueeItem>
            ))
          )}
        </MarqueeContent>
      </Marquee>
    </section>
  )
}

export default OperatingStandard
