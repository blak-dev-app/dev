import React from "react"
import { World } from "@/components/assets/world"
import { Container } from "@/components/container"
import { PartnershipForm } from "@/features/contact/forms/contact.form"

const PartnerPage = () => {
  return (
    <section className="pt-32 pb-24 md:pt-40">
      <Container>
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-[2.5rem]/tight font-bold text-transparent md:text-6xl/tight">
              Get in Touch
            </span>
            <p className="text-lg font-medium text-muted-foreground">
              BLAK is currently seeking conversations with hotels, airlines,
              mobility and fleet companies, corporate travel teams,
              transportation providers, and strategic investors.
            </p>
            <div className="mt-10">
              <World className="h-40 w-auto text-muted-foreground md:h-60" />
            </div>
          </div>
          <div className="ml-auto w-full rounded-2xl border-4 border-ring/10 bg-muted/80 p-8 lg:p-12">
            <PartnershipForm />
          </div>
        </div>
      </Container>
    </section>
  )
}

export default PartnerPage
