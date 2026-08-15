import React from "react"
import { Container } from "@/components/container"

export const DriverHero = () => {
  return (
    <section className="pt-40 pb-16 md:pt-48">
      <Container>
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">
          Careers
        </p>
        <h1 className="mt-4 bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
          Drive with BLAK
        </h1>
        <p className="mt-6 max-w-xl text-lg font-medium text-muted-foreground">
          Join the BLAK fleet as a professional chauffeur and drive with the
          region's premium ground transportation network.
        </p>
      </Container>
    </section>
  )
}
