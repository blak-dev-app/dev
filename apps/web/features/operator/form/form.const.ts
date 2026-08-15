export const COMPANY_TYPES = [
  {
    label: "Luxury Ground Transportation",
    value: "luxury-ground-transportation",
  },
  {
    label: "Chauffeur Services",
    value: "chauffeur-services",
  },
  {
    label: "Executive Transportation",
    value: "executive-transportation",
  },
  {
    label: "Limousine Services",
    value: "limousine-services",
  },
  {
    label: "Premium Fleet Operator",
    value: "premium-fleet-operator",
  },
  {
    label: "Luxury Transportation Group",
    value: "luxury-transportation-group",
  },
  {
    label: "Other",
    value: "other",
  },
] as const

export const OPERATING_MARKETS = [
  { label: "Local / City", value: "local" },
  { label: "Regional", value: "regional" },
  { label: "National", value: "national" },
  { label: "International", value: "international" },
] as const

export const SERVICE_TYPES = [
  { label: "Airport Transfers", value: "airport-transfers" },
  { label: "Point-to-Point Transportation", value: "point-to-point" },
  { label: "Hourly / As-Directed", value: "hourly" },
  { label: "Corporate Transportation", value: "corporate" },
  { label: "Hotel & Hospitality Transportation", value: "hospitality" },
  { label: "Events & Group Transportation", value: "events-groups" },
  { label: "Meet & Greet", value: "meet-and-greet" },
  { label: "Executive & VIP Transportation", value: "executive-vip" },
] as const

export const INITIAL_VALUES = {
  name: "",
  operatingName: "",
  type: "",
  website: "",
  email: "",
  phone: "",

  address: "",
  city: "",
  state: "",
  pincode: "",
  country: "",

  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",

  commerciallyLicensedInsured: "yes",
  operatesLuxurySedansSuvs: "yes",
  operatingMarkets: [],
  yearsInOperation: "",
  vehicleCount: "",
  chauffeurCount: "",
  serviceTypes: [],
}
