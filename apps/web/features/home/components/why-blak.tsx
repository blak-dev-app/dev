import { Container } from "@/components/container"
import { CircleCheck } from "lucide-react"
import Image from "next/image"
import React from "react"

export const WhyBlak = () => {
  return (
    <section className="pb-24">
      <Container>
        <div className="space-y-16">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="flex flex-col justify-center space-y-8 py-20">
              <h2>
                <span className="text-4xl font-semibold">Why BLAK</span>
              </h2>
              <div className="text-4xl font-semibold">
                BLAK creates one hospitality-led standard across every approved
                operator.
              </div>
              <div className="text-2xl font-semibold">
                <ul className="flex flex-col text-muted-foreground *:border-b-2 *:py-4">
                  <li className="flex items-center gap-4">
                    <div className="inline-flex size-9 items-center justify-center rounded-md bg-secondary">
                      <CircleCheck className="size-4 text-primary" />
                    </div>
                    <p>One booking experience</p>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="inline-flex size-9 items-center justify-center rounded-md bg-secondary">
                      <CircleCheck className="size-4 text-primary" />
                    </div>
                    <p>One communication standard</p>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="inline-flex size-9 items-center justify-center rounded-md bg-secondary">
                      <CircleCheck className="size-4 text-primary" />
                    </div>
                    <p>One luxury expectation </p>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="inline-flex size-9 items-center justify-center rounded-md bg-secondary">
                      <CircleCheck className="size-4 text-primary" />
                    </div>
                    <p> One premium arrival </p>
                  </li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl bg-secondary">
              <Image
                src="/why-blak-1.jpg"
                alt="why BLAK"
                width={1000}
                height={800}
                className="h-full w-auto w-full rounded-2xl object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
