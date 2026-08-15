import React from "react"

import { Hero } from "@/features/home/components"
import { TravelExperience } from "@/features/home/components/travel-experience"
import { ExperienceJourney } from "@/features/home/components/experienceJourney"
import { FocusedPilot } from "@/features/home/components/focused-pilot"
import { ManagedExperience } from "@/features/home/components/managed-experience"
import { PartnershipCTA } from "@/features/home/components/partnership-cta"
import OperatingStandard from "@/features/home/components/opaerating-standards"

export default function Page() {
  return (
    <React.Fragment>
      <Hero />
      {/* <OperatingStandard /> */}
      <TravelExperience />
      <ExperienceJourney />
      <ManagedExperience />
      <FocusedPilot />
      <PartnershipCTA />
    </React.Fragment>
  )
}
