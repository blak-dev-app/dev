import {
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Hotel,
  Plane,
  TrendingUp,
} from "lucide-react"

export const DATA = {
  categories: [
    {
      translationKey: "hotelsResorts",
      icon: Hotel,
    },
    {
      translationKey: "airlinesAirports",
      icon: Plane,
    },
    {
      translationKey: "mobilityFleet",
      icon: CarFront,
    },
    {
      translationKey: "corporateTravel",
      icon: BriefcaseBusiness,
    },
    {
      translationKey: "eventsLifestyle",
      icon: CalendarDays,
    },
    {
      translationKey: "strategicInvestors",
      icon: TrendingUp,
    },
  ],
  benefits: [
    {
      translationKey: "consistentGuestExperience",
      image: "/experience.jpg",
    },
    {
      translationKey: "operationalAccountability",
      image: "/accountability.jpg",
    },
    {
      translationKey: "flexiblePilotPrograms",
      image: "/pilot.jpg",
    },
    {
      translationKey: "longTermCommercialValue",
      image: "/commercial-value.jpg",
    },
  ],
  focusedPilot: [
    {
      translationKey: "oneMarketOrProperty",
    },
    {
      translationKey: "approvedDriverNetwork",
    },
    {
      translationKey: "premiumServiceCategories",
    },
    {
      translationKey: "performanceReview",
    },
  ],
  partnershipTypes: [
    { label: "Hotel", value: "hotel" },
    { label: "Airline", value: "airline" },
    { label: "Corporate Travel", value: "corporate-travel" },
    { label: "Event & Concierge", value: "event-concierge" },
    { label: "Fleet Partner", value: "fleet-partner" },
    { label: "Chauffeur / Driver", value: "chauffeur-driver" },
    { label: "Transportation Provider", value: "transportation-provider" },
    { label: "Travel Agency", value: "travel-agency" },
    { label: "Investor", value: "investor" },
    { label: "Other", value: "other" },
  ],
} as const
